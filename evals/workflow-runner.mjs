// In-session Workflow runner — the fast, local RED/GREEN loop.
//
// This is NOT a node script. It runs via Claude Code's Workflow tool, which
// provides the agent()/pipeline()/log()/phase() globals and an `args` input.
// Run it by passing this file as scriptPath and the test-case payload as args:
//
//   Workflow({ scriptPath: "evals/workflow-runner.mjs", args: [ ...cases ] })
//
// Each case: { skill, path, prompt, assertions[] } where `path` is the absolute
// path to the skill's SKILL.md. Build the payload from evals.json, e.g.:
//
//   python3 - <<'PY'
//   import json, glob, os
//   out=[]
//   for f in sorted(glob.glob("skills/*/evals/evals.json")):
//       d=json.load(open(f))
//       if not isinstance(d, dict) or not d.get("pressure_tests"): continue
//       pt=d["pressure_tests"][0]
//       out.append({"skill": os.path.basename(os.path.dirname(os.path.dirname(f))),
//                   "path": os.path.abspath(f.replace("/evals/evals.json","/SKILL.md")),
//                   "prompt": pt["prompt"], "assertions": pt["assertions"]})
//   print(json.dumps(out))
//   PY
//
// For the automated, CI-gated regression harness, use evals/run.py instead.

export const meta = {
  name: 'skill-pressure-evals',
  description: 'Run RED/GREEN pressure-test evals for skills and judge each assertion',
  phases: [{ title: 'Generate' }, { title: 'Judge' }],
}

const JUDGE = {
  type: 'object',
  properties: {
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          assertion: { type: 'string' },
          pass: { type: 'boolean' },
          why: { type: 'string' },
        },
        required: ['assertion', 'pass', 'why'],
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
  `You are a coding assistant in a developer's terminal. You have an installed skill at ${it.path} that you follow when relevant. First read that file, then respond to the developer exactly as you would in a real session, following the skill. Do NOT use any other tools or take any actions — output ONLY the reply message you would send.\n\nDeveloper: "${it.prompt}"`

const judgeP = (it, reply) =>
  `You are a strict, skeptical evaluator. Given an assistant reply to a developer under pressure, decide for EACH assertion whether the reply CLEARLY satisfies it. Be conservative: if in doubt, fail it.\n\nDeveloper message: "${it.prompt}"\n\nAssistant reply:\n"""\n${reply}\n"""\n\nAssertions:\n${it.assertions.map((a, i) => `${i + 1}. ${a}`).join('\n')}\n\nReturn a verdict (assertion text, pass boolean, one-line why) for each assertion, in order.`

phase('Generate')
const items = typeof args === 'string' ? JSON.parse(args) : args
const results = await pipeline(
  items,
  async (it) => {
    const [red, green] = await Promise.all([
      agent(redGen(it), { label: `gen-red:${it.skill}`, phase: 'Generate' }),
      agent(greenGen(it), { label: `gen-green:${it.skill}`, phase: 'Generate', agentType: 'general-purpose' }),
    ])
    return { it, red, green }
  },
  async (g) => {
    const { it, red, green } = g
    const [rj, gj] = await Promise.all([
      agent(judgeP(it, red || ''), { label: `judge-red:${it.skill}`, phase: 'Judge', schema: JUDGE }),
      agent(judgeP(it, green || ''), { label: `judge-green:${it.skill}`, phase: 'Judge', schema: JUDGE }),
    ])
    const score = (j) => (j?.verdicts || []).filter((v) => v.pass).length
    const n = it.assertions.length
    const r = { skill: it.skill, n, red: score(rj), green: score(gj) }
    log(`${it.skill}: RED ${r.red}/${n}  GREEN ${r.green}/${n}`)
    return r
  }
)

const ok = results.filter(Boolean)
const tot = ok.reduce((a, r) => ({ red: a.red + r.red, green: a.green + r.green, n: a.n + r.n }), { red: 0, green: 0, n: 0 })
log(`TOTAL: RED ${tot.red}/${tot.n}  GREEN ${tot.green}/${tot.n}`)
return { results: ok, total: tot }
