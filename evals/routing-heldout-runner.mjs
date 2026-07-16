// Held-out routing probe — k=3 layer-2 runner (in-session, key-free).
//
// Runs via Claude Code's Workflow tool (provides agent()/pipeline()/parallel()/
// log()/phase()). It is the k=3 sibling of evals/routing-runner.mjs, pointed at
// the HAND-AUTHORED held-out set (evals/routing-heldout.json) instead of the
// mined dataset, and it adds per-authoring-category and per-confusable-cluster
// reporting on top of the standard accept-set grading.
//
//   Workflow({ scriptPath: "evals/routing-heldout-runner.mjs", args: {
//     dataset: "<abs>/evals/routing-heldout.json",
//     catalog: "<abs>/catalog.json" }})
//
// Each case is sampled K=3 times in parallel on haiku and majority-voted, exactly
// like the mined-dataset k=3 stability probe. The authoring category is read from
// the id prefix (para: / confuse: / trap: / trivial:) — the runner never needs
// extra fields on the case, so the load projection stays id/kind/skill/accept.
// Grading is unchanged: pass iff the majority winner is in the case's accept set.
//
// Resumable: a full sweep is ~450+ agents and will hit the session limit. Re-run
// with Workflow({ scriptPath, resumeFromRunId: "<runId>" }) — cached agents
// replay, only the tail re-runs. This file does NOT gate CI (see docs/EVALS.md);
// it is a periodic generalization probe.

export const meta = {
  name: 'routing-heldout-k3',
  description: 'k=3 held-out routing generalization probe on haiku (layer 2)',
  phases: [{ title: 'Load' }, { title: 'Route' }],
}

const a = typeof args === 'string' ? JSON.parse(args) : args
const MODEL = 'haiku'
const K = 3

// ---------------------------------------------------------------------------
// Load — id/kind/skill/accept only (prompts stay canonical, read per-agent).
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
log(`loaded ${cases.length} held-out cases; sampling k=${K} each`)

// Authoring category + cluster are encoded in the id prefix.
const catOf = (c) => c.id.split(':')[0] // para | confuse | trap | trivial
const clusterOf = (c) => c.id.split(':')[1] // only meaningful for confuse:*

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

const majority = (arr) => {
  const h = {}
  for (const x of arr) h[x] = (h[x] || 0) + 1
  return Object.entries(h).sort((p, q) => q[1] - p[1])[0]
}

phase('Route')
const routed = await pipeline(cases, (c) =>
  parallel(
    Array.from({ length: K }, (_, i) => () =>
      agent(routePrompt(c), { label: `route:${c.id}#${i + 1}`, phase: 'Route', model: MODEL, schema: CHOICE })
        .then((r) => (r && r.chosen_skill ? r.chosen_skill.trim() : null)),
    ),
  ).then((votes) => {
    const clean = votes.filter(Boolean)
    if (!clean.length) return { ...c, chosen: null, votes: [], errored: true }
    const [winner] = majority(clean)
    return {
      ...c,
      chosen: winner,
      votes: clean,
      unanimous: clean.length === K && clean.every((v) => v === clean[0]),
      pass: c.accept.includes(winner),
    }
  }),
)

const ok = routed.filter((r) => r && !r.errored)
const errored = routed.filter((r) => r && r.errored)
if (errored.length) log(`WARNING errored (excluded): ${errored.map((r) => r.id).join(', ')}`)

const rate = (rows) => (rows.length ? rows.filter((r) => r.pass).length / rows.length : null)
const r3 = (x) => (x == null ? null : Math.round(x * 1000) / 1000)
const byKind = (k) => ok.filter((r) => r.kind === k)
const byCat = (k) => ok.filter((r) => catOf(r) === k)

// --- Standard accept-set metrics (kind-based, comparable to routing.py) ------
const pos = byKind('positive'), bound = byKind('boundary'), triv = byKind('trivial')
const falseAct = triv.length ? triv.filter((r) => !r.pass).length / triv.length : null
log(`KIND      positive ${r3(rate(pos))} (n=${pos.length})  boundary ${r3(rate(bound))} (n=${bound.length})  false-activation ${r3(falseAct)} (n=${triv.length})`)

// --- Per authoring category --------------------------------------------------
const para = byCat('para'), confuse = byCat('confuse'), trap = byCat('trap'), trivialCat = byCat('trivial')
log(`CATEGORY  paraphrase ${r3(rate(para))} (n=${para.length})  confusable ${r3(rate(confuse))} (n=${confuse.length})  trap ${r3(rate(trap))} (n=${trap.length})  trivial ${r3(rate(trivialCat))} (n=${trivialCat.length})`)

// --- Per confusable cluster + confusion pairs on any miss --------------------
const clusters = {}
for (const r of confuse) (clusters[clusterOf(r)] ||= []).push(r)
for (const cl of Object.keys(clusters).sort()) {
  const rows = clusters[cl]
  const misses = rows.filter((r) => !r.pass)
  log(`  cluster ${cl}: ${rows.filter((r) => r.pass).length}/${rows.length} resolved` +
      (misses.length ? '  CONFUSION: ' + misses.map((r) => `${r.skill} -> ${r.chosen} [${r.id}]`).join('; ') : ''))
}

// --- Confusion pairs across every graded positive/boundary/confusable/trap ---
const confusion = {}
for (const r of ok) {
  if (r.pass) continue
  if (r.skill == null) continue // trivial/NONE-trap misses are false-activations, reported below
  const key = `${r.skill} -> ${r.chosen}`
  confusion[key] = (confusion[key] || 0) + 1
}
const confusionPairs = Object.entries(confusion).sort((x, y) => y[1] - x[1])
log(`confusion pairs (misroute skill -> chosen): ${confusionPairs.length ? '' : 'none'}`)
for (const [pair, n] of confusionPairs) log(`  ${n}x  ${pair}`)

// --- False activations: any trivial/NONE-trap that did NOT land on NONE -------
const falseActivations = ok.filter((r) => r.accept.length === 1 && r.accept[0] === 'NONE' && !r.pass)
log(`false activations (should be NONE, routed elsewhere): ${falseActivations.length}`)
for (const r of falseActivations) log(`  ${r.id} -> ${r.chosen}  votes=[${r.votes.join(', ')}]`)

// --- Vote unanimity ----------------------------------------------------------
const unstable = ok.filter((r) => !r.unanimous)
log(`unanimity: ${ok.length - unstable.length}/${ok.length} unanimous; ${unstable.length} split`)
for (const r of unstable) log(`  SPLIT ${r.id}  votes=[${r.votes.join(', ')}]  majority=${r.chosen}  ${r.pass ? 'pass' : 'FAIL'}`)

const failures = ok.filter((r) => !r.pass)
log(`majority FAILURES: ${failures.length}`)
for (const r of failures) log(`  FAIL ${r.id}  chosen=${r.chosen}  accept=[${r.accept.join(', ')}]  votes=[${r.votes.join(', ')}]`)

return {
  k: K,
  model: 'claude-haiku-4-5',
  summary: {
    n: { total: ok.length, positive: pos.length, boundary: bound.length, trivial: triv.length },
    kind: {
      positive_accuracy: r3(rate(pos)),
      boundary_pass_rate: r3(rate(bound)),
      false_activation_rate: r3(falseAct),
    },
    category: {
      paraphrase_accuracy: r3(rate(para)),
      confusable_accuracy: r3(rate(confuse)),
      trap_accuracy: r3(rate(trap)),
      trivial_accuracy: r3(rate(trivialCat)),
    },
    clusters: Object.fromEntries(
      Object.keys(clusters).sort().map((cl) => [cl, {
        resolved: clusters[cl].filter((r) => r.pass).length,
        total: clusters[cl].length,
        confusion: clusters[cl].filter((r) => !r.pass).map((r) => ({ id: r.id, gold: r.skill, chosen: r.chosen })),
      }]),
    ),
    confusion_pairs: confusionPairs,
    false_activations: falseActivations.map((r) => ({ id: r.id, chosen: r.chosen })),
    unanimous_count: ok.length - unstable.length,
    split_count: unstable.length,
    failure_count: failures.length,
  },
  unstable: unstable.map((r) => ({ id: r.id, votes: r.votes, majority: r.chosen, pass: r.pass })),
  failures: failures.map((r) => ({ id: r.id, gold: r.skill, chosen: r.chosen, accept: r.accept, votes: r.votes })),
  cases: Object.fromEntries(ok.map((r) => [r.id, { chosen: r.chosen, votes: r.votes, unanimous: r.unanimous, pass: r.pass }])),
}
