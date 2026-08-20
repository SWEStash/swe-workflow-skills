// In-session Workflow runner — the fast, local RED/GREEN loop, and the arm that
// produces the committed content baseline (evals/baseline.json).
//
// This is NOT a node script. It runs via Claude Code's Workflow tool, which
// provides the agent()/pipeline()/log()/phase() globals and an `args` input.
// Run it by passing this file as scriptPath and the test-case payload as args:
//
//   Workflow({ scriptPath: "evals/workflow-runner.mjs", args: [ ...cases ] })
//
// Each case: { skill, path, kind, id, prompt, assertions[] } where `path` is the
// absolute path to the skill's SKILL.md and `kind` is "eval" | "pressure".
// Build the full payload (all evals + all pressure tests) from evals.json:
//
//   python3 - <<'PY'
//   import json, glob, os
//   out=[]
//   for f in sorted(glob.glob("skills/*/evals/evals.json")):
//       d=json.load(open(f))
//       if isinstance(d, list): d={"evals": d, "pressure_tests": []}
//       skill=os.path.basename(os.path.dirname(os.path.dirname(f)))
//       path=os.path.abspath(f.replace("/evals/evals.json","/SKILL.md"))
//       for kind, key in (("eval","evals"), ("pressure","pressure_tests")):
//           for c in d.get(key, []):
//               out.append({"skill": skill, "path": path, "kind": kind,
//                           "id": c["id"], "prompt": c["prompt"],
//                           "assertions": c["assertions"]})
//   print(json.dumps(out))
//   PY
//
// GREEN reads the skill (option A): the generator may open any file inside the
// skill's OWN directory — references/ and templates/ included — because that is
// what a real session does. About half the library's instructional bytes live
// there. This makes GREEN nondeterministic in a second way (which files the
// agent chooses to open), on top of normal sampling variance. RED is unchanged
// and tool-less; the RED/GREEN contrast is the whole signal.
//
// The judge is keyed on assertion INDEX and mirrors evals/run.py's wording and
// VERDICT_SCHEMA, so rows recorded here are comparable with rows the Python arm
// produces. Output includes a `baseline` object in evals/baseline.json's shape.
//
// For the automated, CI-gated regression harness, use evals/run.py instead.

export const meta = {
  name: 'skill-content-evals',
  description: 'Run RED/GREEN content evals for skills and judge each assertion by index',
  phases: [{ title: 'Generate' }, { title: 'Judge' }],
}

// Mirrors VERDICT_SCHEMA in evals/run.py — index-keyed, so verdict order is
// guaranteed by the schema rather than requested in prose.
const JUDGE = {
  type: 'object',
  properties: {
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'integer' },
          pass: { type: 'boolean' },
          why: { type: 'string' },
        },
        required: ['index', 'pass', 'why'],
        additionalProperties: false,
      },
    },
  },
  required: ['verdicts'],
  additionalProperties: false,
}

const redGen = (it) =>
  `You are a coding assistant in a developer's terminal. Respond exactly as you naturally would in a real session. Do NOT use any tools — output ONLY the reply message you would send.\n\nDeveloper: "${it.prompt}"`

const greenGen = (it) =>
  `You are a coding assistant in a developer's terminal. You have an installed skill at ${it.path} that you follow when relevant. First read that file. Its directory (${it.dir}) also holds the skill's references/ and templates/ — read any of those the skill points you to, exactly as you would in a real session. Read ONLY files inside ${it.dir}. Do NOT write or edit files, do NOT run commands, and do NOT act on the repo in any way. Output ONLY the reply message you would send.\n\nDeveloper: "${it.prompt}"`

const judgeP = (it, reply) =>
  `You are a strict, skeptical evaluator of assistant behavior.\n\nA developer wrote this under pressure:\n"${it.prompt}"\n\nAn assistant replied:\n"""\n${reply}\n"""\n\nDecide, for EACH assertion, whether the reply CLEARLY satisfies it. Be conservative: if in doubt, fail it. Return one verdict per assertion by index.\n\nAssertions:\n${it.assertions.map((a, i) => `${i}. ${a}`).join('\n')}`

phase('Generate')
// Model pin: generators and judges run on opus explicitly rather than the
// inherited session model, so a sweep is internally consistent. Note 'opus' is
// a harness SHORTHAND, not a resolved model id — it tracks whatever opus the
// session runs. Cross-session comparability therefore depends on recording the
// resolved id, which the operator reports and substitutes into the baseline's
// provenance fields. Routing evals stay on haiku in routing-runner.mjs; the two
// pins are independent and deliberate.
const MODEL = 'opus'
const RUNNER = 'workflow-runner.mjs'

// Payload is either a bare case array (k=1) or { k, cases } for majority voting.
const input = typeof args === 'string' ? JSON.parse(args) : args
const K = Math.min(9, Math.max(1, Number(Array.isArray(input) ? 1 : input.k) || 1))
const cases = Array.isArray(input) ? input : input.cases

const items = cases.map((it) => ({
  ...it,
  kind: it.kind || 'eval',
  dir: it.path.replace(/\/[^/]*$/, ''),
}))

// Majority vote per assertion index across the surviving rounds. Ties fail:
// the judge prompt already says "if in doubt, fail it", and a recorded false
// can never fire run.py's regression check, so the conservative side is the
// safe one. With one surviving round this degrades to that round's verdict.
const vote = (rounds, n) =>
  Array.from({ length: n }, (_, i) => rounds.filter((r) => r[i]).length * 2 > rounds.length)

// Never let one failed agent poison a row: routing-runner.mjs excludes errored
// cases rather than scoring them, because an all-false row silently understates
// GREEN and would be committed as if it were evidence.
//
// A rejected promise is the EASY case. The dangerous one is a RESOLVED null: the
// Workflow tool returns null (it does not throw) when an agent dies on a terminal
// API error after retries — a quota limit mid-sweep is the common trigger. Treating
// that as a value gives toBools() nothing to read, so every assertion comes back
// false and the row is recorded as evidence with `errored: []`. A quota-killed sweep
// then yields a well-formed, shape-check-passing, entirely fabricated 0/n baseline.
// Resolve-with-null must fail the same way a throw does.
const safe = (p) => p.then(
  (v) => (v == null || v === '' ? { ok: false, e: 'agent returned null/empty (terminal API error after retries)' } : { ok: true, v }),
  (e) => ({ ok: false, e: String(e) }),
)

// Per-assertion booleans, index-aligned. A count cannot drive run.py's
// `was && !now` check: 5/8 -> 5/8 with a DIFFERENT assertion failing is invisible.
const toBools = (j, n) => {
  const m = new Map((j?.verdicts || []).map((v) => [v.index, v.pass === true]))
  return Array.from({ length: n }, (_, i) => m.get(i) === true)
}

const rounds = Array.from({ length: K }, (_, i) => i)

const results = await pipeline(
  items,
  async (it) => {
    // K independent generations per arm. Each round is judged separately below;
    // re-judging one generation K times would measure judge variance only, and
    // generator variance is the larger of the two.
    const gens = await Promise.all(
      rounds.flatMap((r) => [
        safe(agent(redGen(it), { label: `gen-red:${it.skill}:${it.kind}${it.id}#${r}`, phase: 'Generate', model: MODEL })),
        safe(agent(greenGen(it), { label: `gen-green:${it.skill}:${it.kind}${it.id}#${r}`, phase: 'Generate', agentType: 'general-purpose', model: MODEL })),
      ])
    )
    return { it, red: gens.filter((_, i) => i % 2 === 0), green: gens.filter((_, i) => i % 2 === 1) }
  },
  async (g) => {
    const { it, red, green } = g
    const key = `${it.kind}:${it.id}`
    const n = it.assertions.length
    // A judge that returns no verdicts is indistinguishable from the null case
    // above once toBools() has run: 0 verdicts -> n false booleans. Drop it too.
    const noVerdicts = (x) => !Array.isArray(x?.v?.verdicts) || x.v.verdicts.length === 0
    const judgeArm = async (arm, gs) => {
      const js = await Promise.all(
        gs.map((gen, r) =>
          gen.ok
            ? safe(agent(judgeP(it, gen.v), { label: `judge-${arm}:${it.skill}:${it.kind}${it.id}#${r}`, phase: 'Judge', schema: JUDGE, model: MODEL }))
            : Promise.resolve({ ok: false, e: 'generator failed' })
        )
      )
      return js.filter((j) => j.ok && !noVerdicts(j)).map((j) => toBools(j.v, n))
    }
    const [redR, greenR] = await Promise.all([judgeArm('red', red), judgeArm('green', green)])
    // A round that died is a round we don't have, not a round of falses. Vote on
    // what survived; only a total wipeout of an arm excludes the case.
    if (!redR.length || !greenR.length) {
      log(`${it.skill} ${key}: NO SURVIVING ROUNDS — excluded`)
      return { skill: it.skill, kind: it.kind, id: it.id, key, n, errored: true }
    }
    const k = Math.min(redR.length, greenR.length)
    const redB = vote(redR, n)
    const greenB = vote(greenR, n)
    const r = { skill: it.skill, kind: it.kind, id: it.id, key, n, red: redB, green: greenB, k }
    const short = k < K ? `  (k=${k} of ${K}: RED ${redR.length}, GREEN ${greenR.length} rounds survived)` : ''
    log(`${it.skill} ${key}: RED ${redB.filter(Boolean).length}/${n}  GREEN ${greenB.filter(Boolean).length}/${n}${short}`)
    return r
  }
)

const all = results.filter(Boolean)
const ok = all.filter((r) => !r.errored)
const errored = all.filter((r) => r.errored).map((r) => `${r.skill} ${r.key}`)
const sum = (rows, arm) => rows.reduce((a, r) => a + r[arm].filter(Boolean).length, 0)
const tot = { red: sum(ok, 'red'), green: sum(ok, 'green'), n: ok.reduce((a, r) => a + r.n, 0) }

// evals/baseline.json shape — follows evals/routing-baseline.json's precedent
// (top-level _note/model/k + a nested container), with per-row provenance so
// run.py can compare only same-model rows.
const skills = {}
for (const r of ok) {
  // r.k is the number of rounds actually voted, which is K unless rounds died.
  ;(skills[r.skill] ||= {})[r.key] = { green: r.green, red: r.red, model: MODEL, k: r.k, runner: RUNNER }
}
const degraded = ok.filter((r) => r.k < K).map((r) => `${r.skill} ${r.key} (k=${r.k})`)

const baseline = {
  _note:
    `Content baseline recorded in-session via evals/${RUNNER} (Workflow tool, subscription) at k=${K} over ${ok.length} cases, option A (GREEN generator may read files inside the skill's own directory). ` +
    `REPLACE "model" here and in every row with the resolved model id reported by the running session — "${MODEL}" is a harness shorthand, not a model id. ` +
    `Refresh by re-running the in-session runner, or \`python evals/run.py --all --update-baseline\` (needs ANTHROPIC_API_KEY). ` +
    `The gate (run.py / skill-evals.yml) fails if an assertion green here later goes red on a same-model row. ` +
    (K > 1
      ? `Each assertion is a majority of ${K} independent generate-and-judge rounds per arm; ties fail. Rows record the rounds actually voted, which is below ${K} where a round died.`
      : `k=1 is noisy on some cases — pass { k, cases } as the payload to vote instead.`),
  model: MODEL,
  k: K,
  runner: RUNNER,
  option: 'A',
  summary: { cases: ok.length, excluded: errored.length, assertions: tot.n, red: tot.red, green: tot.green },
  skills,
}

log(`TOTAL: RED ${tot.red}/${tot.n}  GREEN ${tot.green}/${tot.n}  (${ok.length} cases at k=${K}${errored.length ? `, ${errored.length} excluded` : ''})`)
if (errored.length) log(`EXCLUDED: ${errored.join(', ')}`)
if (degraded.length) log(`FEWER ROUNDS THAN k=${K}: ${degraded.join(', ')}`)
return { results: ok, errored, total: tot, baseline }
