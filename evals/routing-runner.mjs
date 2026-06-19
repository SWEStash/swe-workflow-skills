// In-session routing (activation) eval — the fast, key-free runner.
//
// This is NOT a node script. It runs via Claude Code's Workflow tool, which
// provides the agent()/pipeline()/parallel()/log()/phase() globals and an `args`
// input. It mirrors evals/workflow-runner.mjs (the content-quality sibling) but
// measures the ROUTING factor instead: does the right skill get activated?
//
// Run it on haiku (skill-router's shipping model). args is just file paths — the
// agents read the committed catalog + dataset themselves, exactly as the real
// skill-router reads .catalog.json at runtime:
//
//   Workflow({ scriptPath: "evals/routing-runner.mjs", args: {
//     dataset: "<abs>/evals/routing-dataset.json",
//     catalog: "<abs>/catalog.json",
//   }})
//
// Two phases:
//   Route       — layer 2: each haiku agent reads the catalog + its mined case,
//                 and emits a structured { chosen_skill | NONE }. Graded by
//                 accept-set membership. Top-1 accuracy, false-activation,
//                 confusion pairs. Reproduces evals/routing.py without a key.
//   Behavioral  — layer 3: a haiku agent is told it has a Skill(name) tool and
//                 decides whether to INVOKE a skill or answer directly. Catches
//                 what layer 2 can't: does the orchestrator fire, does it invoke
//                 vs merely name, does it over-route on trivial prompts.
//
// For the CI regression gate (with an API key), use evals/routing.py.

export const meta = {
  name: 'routing-evals',
  description: 'Measure skill-router activation accuracy on haiku (layer 2 + layer 3)',
  phases: [{ title: 'Load' }, { title: 'Route' }, { title: 'Behavioral' }],
}

const a = typeof args === 'string' ? JSON.parse(args) : args
const MODEL = 'haiku'
const LAYER3_PER_KIND = a.layer3PerKind ?? 8  // ?? not || — allow an explicit 0

// ---------------------------------------------------------------------------
// Load the mined case list (id/kind/skill/accept only — prompts stay in the
// canonical file and are read per-agent, never echoed, so prompt text can't be
// corrupted in transit). A garbled id/accept here surfaces as a visible miss.
// ---------------------------------------------------------------------------
phase('Load')
const CASES = {
  type: 'object',
  properties: {
    cases: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          kind: { type: 'string', enum: ['positive', 'boundary', 'trivial'] },
          skill: { type: 'string' },
          accept: { type: 'array', items: { type: 'string' } },
        },
        required: ['id', 'kind', 'accept'],
        additionalProperties: true,
      },
    },
  },
  required: ['cases'],
  additionalProperties: false,
}

const loaded = await agent(
  `Read the JSON file at ${a.dataset}. Return its .cases array, but for each case ` +
    `include ONLY the fields id, kind, skill, and accept (omit prompt). Copy values verbatim.`,
  { label: 'load:cases', phase: 'Load', model: MODEL, schema: CASES },
)
const cases = (loaded?.cases || []).map((c) => ({ ...c, skill: c.skill ?? null }))
log(`loaded ${cases.length} cases`)

// The shared routing instruction — mirrors skills/skill-router/SKILL.md and the
// system prompt in evals/routing.py. Each agent reads the catalog itself (the
// real router reads .catalog.json at runtime), then routes.
const ROUTING_INSTRUCTION =
  `You are skill-router, the orchestrator for the swe-workflow skills library in ` +
  `Claude Code. First read the skill catalog JSON at ${a.catalog} — it lists every ` +
  `skill's name and description. Given a developer's message, decide which ONE skill ` +
  `should be activated.\n\n` +
  `How to route:\n` +
  `- Match the developer's intent to the single best-fit skill in the catalog ` +
  `(ignore the "skill-router" entry — that is you, not a routable target).\n` +
  `- Most skills are loaded name-only and only run when routed to, so this decision ` +
  `is the activation path.\n` +
  `- If nothing fits — the message is trivial, conversational, a pure question, a ` +
  `tiny mechanical edit (typo/rename), or otherwise needs no workflow — choose ` +
  `"NONE". Do NOT over-route: an unnecessary activation costs an extra hop.\n` +
  `- The developer's explicit instructions take precedence. Choose exactly one.`

// ---------------------------------------------------------------------------
// Layer 2 — structured routing choice
// ---------------------------------------------------------------------------
const CHOICE = {
  type: 'object',
  properties: {
    reasoning: { type: 'string' },
    chosen_skill: { type: 'string' },
  },
  required: ['reasoning', 'chosen_skill'],
  additionalProperties: false,
}

const routePrompt = (c) =>
  `${ROUTING_INSTRUCTION}\n\n` +
  `Read the JSON file at ${a.dataset} and find the case whose id is "${c.id}". ` +
  `Use that case's .prompt as the developer message. Then choose exactly one skill ` +
  `name to activate, or "NONE" if no workflow applies. Put the chosen name (or ` +
  `"NONE") in chosen_skill.`

phase('Route')
const routed = await pipeline(cases, (c) =>
  agent(routePrompt(c), { label: `route:${c.id}`, phase: 'Route', model: MODEL, schema: CHOICE })
    .then((r) => {
      // A null/empty result means the agent errored (e.g. rate/session limit) —
      // that is NOT a routing decision. Mark it errored so it's excluded from
      // metrics and the baseline rather than being miscounted as a "NONE" vote.
      if (!r || !r.chosen_skill) return { ...c, chosen: null, errored: true }
      const chosen = r.chosen_skill.trim()
      return { ...c, chosen, pass: c.accept.includes(chosen) }
    }),
)

const errored = routed.filter((r) => r && r.errored)
if (errored.length) log(`WARNING: ${errored.length} agents errored (excluded from metrics): ${errored.map((r) => r.id).slice(0, 5).join(', ')}${errored.length > 5 ? ' …' : ''}`)
const ok = routed.filter((r) => r && !r.errored)
const byKind = (k) => ok.filter((r) => r.kind === k)
const rate = (rows) => (rows.length ? rows.filter((r) => r.pass).length / rows.length : null)
const r3 = (x) => (x == null ? null : Math.round(x * 1000) / 1000)

const pos = byKind('positive')
const bound = byKind('boundary')
const triv = byKind('trivial')
const confusion = {}
for (const r of [...pos, ...bound]) {
  if (!r.pass) {
    const key = `${r.skill} -> ${r.chosen}`
    confusion[key] = (confusion[key] || 0) + 1
  }
}
const confusionPairs = Object.entries(confusion).sort((x, y) => y[1] - x[1])
const falseActivation = triv.length ? triv.filter((r) => !r.pass).length / triv.length : null

log(`LAYER 2  positive(top-1) ${r3(rate(pos))} (n=${pos.length})  ` +
    `boundary ${r3(rate(bound))} (n=${bound.length})  ` +
    `false-activation ${r3(falseActivation)} (n=${triv.length})`)
for (const [pair, n] of confusionPairs) log(`  confusion ${n}x  ${pair}`)

// ---------------------------------------------------------------------------
// Layer 3 — behavioral: does the router fire / invoke vs merely name / over-route?
// ---------------------------------------------------------------------------
const BEHAVIOR = {
  type: 'object',
  properties: {
    reasoning: { type: 'string' },
    action: { type: 'string', enum: ['invoke_skill', 'answer_directly'] },
    skill: { type: 'string' },
  },
  required: ['reasoning', 'action', 'skill'],
  additionalProperties: false,
}

const behaviorPrompt = (c) =>
  `You are operating as skill-router inside a real Claude Code session. You have a ` +
  `Skill(name) tool that ACTIVATES a named workflow skill; you may also just answer ` +
  `the developer directly without any workflow. ${ROUTING_INSTRUCTION}\n\n` +
  `Read the JSON file at ${a.dataset} and find the case whose id is "${c.id}"; use ` +
  `its .prompt as the developer message. Decide what you would actually DO right now: ` +
  `either invoke the Skill tool to activate one skill (action="invoke_skill", ` +
  `skill=<name>) or handle it yourself (action="answer_directly", skill="NONE"). Do ` +
  `not merely name a skill in prose without invoking it — if a skill should run, invoke it.`

const layer3 = [
  ...pos.slice(0, LAYER3_PER_KIND),
  ...triv.slice(0, LAYER3_PER_KIND),
]

phase('Behavioral')
const behaved = await parallel(
  layer3.map((c) => () =>
    agent(behaviorPrompt(c), { label: `behave:${c.id}`, phase: 'Behavioral', model: MODEL, schema: BEHAVIOR })
      .then((r) => (r && r.action ? { ...c, action: r.action, skill: (r.skill ?? 'NONE').trim() } : null)),
  ),
)
const b = behaved.filter(Boolean)  // dropped entries = errored agents, excluded
const bPos = b.filter((r) => r.kind === 'positive')
const bTriv = b.filter((r) => r.kind === 'trivial')
const fired = bPos.filter((r) => r.action === 'invoke_skill')
const correctInvoke = fired.filter((r) => r.accept.includes(r.skill))
const overRoute = bTriv.filter((r) => r.action === 'invoke_skill')
const invocationRate = bPos.length ? fired.length / bPos.length : null

log(`LAYER 3  router-invocation ${r3(invocationRate)} (${fired.length}/${bPos.length} fired)  ` +
    `correct-invoke ${correctInvoke.length}/${bPos.length}  ` +
    `over-route ${overRoute.length}/${bTriv.length} trivial`)

const summary = {
  model: 'claude-haiku-4-5',
  layer2: {
    n_positive: pos.length, n_boundary: bound.length, n_trivial: triv.length,
    positive_accuracy: r3(rate(pos)),
    boundary_pass_rate: r3(rate(bound)),
    false_activation_rate: r3(falseActivation),
    confusion_pairs: confusionPairs,
  },
  layer3: {
    n_positive: bPos.length, n_trivial: bTriv.length,
    router_invocation_rate: r3(invocationRate),
    correct_invoke: correctInvoke.length,
    over_route: overRoute.length,
  },
}

return {
  summary,
  // baseline-format cases (runner-agnostic) — consumable by routing.py's gate
  cases: Object.fromEntries(ok.map((r) => [r.id, { chosen: r.chosen, pass: r.pass }])),
  misroutes: ok.filter((r) => !r.pass).map((r) => ({ id: r.id, chosen: r.chosen, accept: r.accept })),
}
