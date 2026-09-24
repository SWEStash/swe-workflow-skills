// In-session routing (activation) eval — the fast, key-free runner.
//
// This is NOT a node script. It runs via Claude Code's Workflow tool, which
// provides the agent()/pipeline()/parallel()/log()/phase() globals and an `args`
// input. It mirrors evals/workflow-runner.mjs (the content-quality sibling) but
// measures the ROUTING factor instead: does the right skill get activated?
//
// Run it on haiku (skill-router's shipping model). The cases arrive in args with
// their prompts, built from the committed dataset; each agent gets its developer
// message inline and reads only the catalog, exactly as the real skill-router
// reads .catalog.json at runtime. The accept set never reaches an agent: the
// dataset file carries it beside every prompt, so an agent sent to read that file
// routes with the answer in hand. `evals/check-red-leaks.mjs` flags one that does.
//
//   Workflow({ scriptPath: "evals/routing-runner.mjs", args: {
//     catalog: "<abs>/catalog.json",
//     cases: [{ id, kind, skill, prompt, accept }, ...],   // routing-dataset.json .cases
//     k: 3,                                               // votes per case (default 3)
//   }})
//
// Two phases:
//   Route       — layer 2: k haiku agents per case read the catalog and each emit
//                 a structured { chosen_skill | NONE }; the case's route is the
//                 majority (first-seen breaks ties, as in routing.py -k). Graded by
//                 accept-set membership. Top-1 accuracy, false-activation,
//                 confusion pairs. Reproduces evals/routing.py without a key.
//   Behavioral  — layer 3: a haiku agent is told it has a Skill(name) tool and
//                 decides whether to INVOKE a skill or answer directly. Catches
//                 what layer 2 can't: does the orchestrator fire, does it invoke
//                 vs merely name, does it over-route on trivial prompts. One vote
//                 per case; it is reported, not gated.
//
// A vote that comes back empty is drawn again, up to `tries` (default 3) times.
// A case with no vote is errored and one with fewer than k is degraded; both are
// returned by id and left out of the metrics and the baseline cases, so a short
// run cannot pass as a complete one.
//
// For the CI regression gate (with an API key), use evals/routing.py.

export const meta = {
  name: 'routing-evals',
  description: 'Measure skill-router activation accuracy on haiku (layer 2 + layer 3)',
  phases: [{ title: 'Route' }, { title: 'Behavioral' }],
}

const a = typeof args === 'string' ? JSON.parse(args) : args
const MODEL = 'haiku'
const K = a.k ?? 3
const LAYER3_PER_KIND = a.layer3PerKind ?? 8  // ?? not || — allow an explicit 0
const TRIES = a.tries ?? 3

// A haiku agent occasionally routes and then writes its structured answer as text
// instead of calling the tool, so the vote comes back empty. That vote never
// happened: drawing it again selects nothing, where resuming the run would re-run
// every agent launched after it. Each retry gets its own label so a resume
// replays it rather than conflating it with the failed attempt.
const ask = async (prompt, opts, answered) => {
  for (let t = 0; t < TRIES; t++) {
    const r = await agent(prompt, { ...opts, label: t ? `${opts.label}~retry${t}` : opts.label })
    if (answered(r)) return r
  }
  return null
}

const cases = (a.cases || []).map((c) => ({ ...c, skill: c.skill ?? null }))
const malformed = cases.filter((c) => !c.id || !c.kind || typeof c.prompt !== 'string' || !Array.isArray(c.accept))
if (!a.catalog || !cases.length || malformed.length)
  throw new Error(`routing-runner: need args.catalog and args.cases[{id, kind, prompt, accept}]; ` +
    `${malformed.length} malformed: ${malformed.slice(0, 3).map((c) => c.id).join(', ')}`)
log(`${cases.length} cases, k=${K}`)

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

// The developer message goes in the prompt itself, never as a pointer to a file:
// the only file an agent is sent to is the catalog.
const message = (c) =>
  `Read no file other than the catalog. The developer's message is:\n${JSON.stringify(c.prompt)}`

const routePrompt = (c) =>
  `${ROUTING_INSTRUCTION}\n\n${message(c)}\n\n` +
  `Choose exactly one skill name to activate, or "NONE" if no workflow applies. ` +
  `Put the chosen name (or "NONE") in chosen_skill.`

// Mode of the votes, first-seen breaking ties — the rule routing.py's -k uses.
const majority = (votes) => {
  const n = new Map()
  for (const v of votes) n.set(v, (n.get(v) ?? 0) + 1)
  let best = null
  for (const [v, count] of n) if (best === null || count > n.get(best)) best = v
  return best
}

phase('Route')
const routed = await pipeline(cases, (c) =>
  parallel(Array.from({ length: K }, (_, i) => () =>
    ask(routePrompt(c), { label: `route:${c.id}#${i}`, phase: 'Route', model: MODEL, schema: CHOICE }, (r) => r?.chosen_skill),
  )).then((rs) => {
    // A null/empty result means the agent errored (e.g. rate/session limit) —
    // that is NOT a routing decision, so it is dropped rather than miscounted as
    // a "NONE" vote.
    const votes = rs.filter((r) => r && r.chosen_skill).map((r) => r.chosen_skill.trim())
    if (!votes.length) return { ...c, votes, chosen: null, errored: true }
    const chosen = majority(votes)
    return { ...c, votes, chosen, pass: c.accept.includes(chosen), degraded: votes.length < K }
  }),
)

const errored = routed.filter((r) => r && r.errored)
const degraded = routed.filter((r) => r && r.degraded)
if (errored.length) log(`WARNING: ${errored.length} cases got no vote (excluded from metrics): ${errored.map((r) => r.id).slice(0, 5).join(', ')}${errored.length > 5 ? ' …' : ''}`)
if (degraded.length) log(`WARNING: ${degraded.length} cases got fewer than ${K} votes (excluded from metrics): ${degraded.map((r) => r.id).slice(0, 5).join(', ')}${degraded.length > 5 ? ' …' : ''}`)
const ok = routed.filter((r) => r && !r.errored && !r.degraded)
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
  `${message(c)}\n\nDecide what you would actually DO right now: ` +
  `either invoke the Skill tool to activate one skill (action="invoke_skill", ` +
  `skill=<name>) or handle it yourself (action="answer_directly", skill="NONE"). Do ` +
  `not merely name a skill in prose without invoking it — if a skill should run, invoke it.\n\n` +
  // The agent runs with real tools. Scoring reads only the structured action, and an
  // agent that actually invoked a skill once went on to do the task and publish the
  // result to the user's account.
  `Record that decision in your structured answer only. Do not call the Skill tool or ` +
  `any other tool besides reading the catalog, and do not carry out the developer's task.`

const layer3 = [
  ...cases.filter((c) => c.kind === 'positive').slice(0, LAYER3_PER_KIND),
  ...cases.filter((c) => c.kind === 'trivial').slice(0, LAYER3_PER_KIND),
]

phase('Behavioral')
const behaved = await parallel(
  layer3.map((c) => () =>
    ask(behaviorPrompt(c), { label: `behave:${c.id}`, phase: 'Behavioral', model: MODEL, schema: BEHAVIOR }, (r) => r?.action)
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
  k: K,
  summary,
  // baseline-format cases (runner-agnostic) — consumable by routing.py's gate
  cases: Object.fromEntries(ok.map((r) => [r.id, { chosen: r.chosen, pass: r.pass, votes: r.votes }])),
  misroutes: ok.filter((r) => !r.pass).map((r) => ({ id: r.id, chosen: r.chosen, votes: r.votes, accept: r.accept })),
  errored: errored.map((r) => r.id),
  degraded: degraded.map((r) => ({ id: r.id, votes: r.votes })),
}
