#!/usr/bin/env node
// Merge eval results into evals/baseline.json, one ROW at a time.
//
//   node evals/merge-baseline.mjs <results.json> --model <resolved-id> [options]
//
// Options include --transcripts <dir>, which scans the run's transcripts and
// refuses any row whose control arm loaded the skill under test.
//
// <results.json> is the { results, errored, total, baseline } object returned by
// evals/workflow-runner.mjs (the Workflow arm). Rows are read from its
// `baseline.skills`, falling back to `results`.
//
// WHY THIS EXISTS. Two other paths look like they would do the job and don't:
//
//   * By hand. The baseline is 234 rows of positional booleans plus a summary that
//     must be recomputed. The failure mode is silent: a row left on the runner's
//     "opus" shorthand never matches EVAL_GEN_MODEL, so run.py reports it "not
//     comparable" and skips it — the gate keeps passing while covering less.
//   * run.py --update-baseline. It merges SKILL-level ({**base_skills, **results}),
//     so re-running a subset of one skill's cases silently drops that skill's other
//     rows. It also needs ANTHROPIC_API_KEY, which the Workflow arm does not have.
//
// This merges by (skill, case-id), leaves every untouched row byte-identical, and
// refuses to write when a row looks corrupt. It is idempotent: merging the same
// results twice is a no-op, so it does not matter which session merges first.
//
// Output formatting matches what run.py writes (json.dumps indent=2, ensure_ascii),
// so a merge produces a minimal diff rather than reformatting the whole file.

import fs from 'node:fs'
import path from 'node:path'
import { scanRun, loadCases } from './check-red-leaks.mjs'

const HARNESS_SHORTHANDS = new Set(['opus', 'sonnet', 'haiku', 'fable'])
const NON_ASCII = new RegExp('[\\u007f-\\uffff]', 'g')

const die = (msg) => {
  console.error(`error: ${msg}`)
  process.exit(1)
}

// ---------------------------------------------------------------- arguments

const argv = process.argv.slice(2)
const opts = { baseline: 'evals/baseline.json', skillsDir: 'skills', dryRun: false }
let resultsPath = null

for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  const next = () => argv[++i] ?? die(`${a} needs a value`)
  if (a === '--model') opts.model = next()
  else if (a === '--baseline') opts.baseline = next()
  else if (a === '--out') opts.out = next()
  else if (a === '--note') opts.note = next()
  else if (a === '--skills-dir') opts.skillsDir = next()
  else if (a === '--dry-run') opts.dryRun = true
  else if (a === '--allow-degraded') opts.allowDegraded = true
  else if (a === '--transcripts') opts.transcripts = next()
  else if (a === '--allow-contaminated') opts.allowContaminated = true
  else if (a === '-h' || a === '--help') {
    console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 27).join('\n'))
    process.exit(0)
  } else if (a.startsWith('-')) die(`unknown flag ${a}`)
  else if (resultsPath) die(`unexpected extra argument ${a}`)
  else resultsPath = a
}

if (!resultsPath) die('missing <results.json>. See --help.')
if (!opts.model) die('--model is required: the resolved model id the agents ran on.')
opts.out ??= opts.baseline

// The model guard is the whole reason a row gates instead of being skipped.
if (HARNESS_SHORTHANDS.has(opts.model)) {
  die(
    `--model "${opts.model}" is a harness shorthand, not a model id. The runner pins ` +
      `'opus' and the operator substitutes the resolved id (e.g. claude-opus-5). ` +
      `run.py compares this string exactly; a shorthand makes every merged row skip ` +
      `as "not comparable" instead of gating.`
  )
}
if (/[[\]]/.test(opts.model)) {
  die(
    `--model "${opts.model}" carries a variant suffix. Record the base id ` +
      `(e.g. claude-opus-5, not claude-opus-5[1m]) — same model, and run.py compares ` +
      `the string exactly, so the suffix would make these rows skip rather than gate.`
  )
}

// The note is appended verbatim into a tracked file whose _note is a single
// ~29,000-character line, so a private label entering here renders as one
// unreadable +/- line pair in review and ships. Two releases shipped labels this
// way before anyone noticed. Guard at the ingress rather than hoping a reviewer
// reads the line.
const PRIVATE_LABEL = /\b(Cycle|Phase|Batch|CP)\s*\d/i
const RUN_ID = /wf_[a-z0-9-]{3,}/
if (opts.note && PRIVATE_LABEL.test(opts.note)) {
  die(
    `--note contains "${opts.note.match(PRIVATE_LABEL)[0]}" — a planning label no reader of ` +
      `this repo can resolve. The note ships in evals/baseline.json. Write what the run ` +
      `covered instead (e.g. "re-measured the rows where the control arm loaded the skill").`
  )
}
if (opts.note && RUN_ID.test(opts.note)) {
  console.warn(
    `warning: --note cites ${opts.note.match(RUN_ID)[0]}, which is resolvable only inside the ` +
      `session that ran it. Kept as provenance, but it explains nothing on its own.`
  )
}

// ---------------------------------------------------------------- load input

const readJson = (p, what) => {
  if (!fs.existsSync(p)) die(`${what} not found: ${p}`)
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch (e) {
    die(`${what} is not valid JSON (${p}): ${e.message}`)
  }
}

const resultsFile = readJson(resultsPath, 'results file')
const baseline = readJson(opts.baseline, 'baseline')
if (!baseline.skills || typeof baseline.skills !== 'object') die(`${opts.baseline} has no "skills" object`)

// Rows: prefer the runner's own pre-grouped baseline.skills, else rebuild from results[].
const incoming = []
if (resultsFile.baseline?.skills) {
  for (const [skill, cases] of Object.entries(resultsFile.baseline.skills))
    for (const [key, row] of Object.entries(cases)) incoming.push({ skill, key, row })
} else if (Array.isArray(resultsFile.results)) {
  for (const r of resultsFile.results) {
    if (r.errored) continue
    incoming.push({
      skill: r.skill,
      key: r.key ?? `${r.kind}:${r.id}`,
      row: { green: r.green, red: r.red, model: opts.model, k: r.k, runner: 'workflow-runner.mjs' },
    })
  }
} else {
  die(`${resultsPath} has neither baseline.skills nor a results array`)
}
if (!incoming.length) die(`${resultsPath} contains no mergeable rows`)

if (resultsFile.errored?.length) {
  console.warn(
    `warning: the run excluded ${resultsFile.errored.length} case(s) — they carry no row and ` +
      `keep their previous baseline value: ${resultsFile.errored.join(', ')}`
  )
}

// ------------------------------------------------- validate before we mutate

// On-disk assertion counts. Baseline green/red are POSITIONAL: a row whose length
// disagrees with the current evals.json means the assertion list moved under us
// (one deleted shifts every index above it), and merging it would silently
// re-point every verdict at the wrong assertion.
const assertionCount = (skill, key) => {
  const f = path.join(opts.skillsDir, skill, 'evals', 'evals.json')
  if (!fs.existsSync(f)) return { err: `no evals.json at ${f}` }
  let d
  try {
    d = JSON.parse(fs.readFileSync(f, 'utf8'))
  } catch (e) {
    return { err: `${f} is not valid JSON: ${e.message}` }
  }
  if (Array.isArray(d)) d = { evals: d, pressure_tests: [] }
  const [kind, idRaw] = key.split(':')
  const list = kind === 'eval' ? d.evals : d.pressure_tests
  const c = (list || []).find((x) => String(x.id) === idRaw)
  if (!c) return { err: `case ${key} not found in ${f}` }
  return { n: c.assertions.length }
}

const problems = []
const plan = []

for (const { skill, key, row } of incoming) {
  const where = `${skill} ${key}`
  if (!Array.isArray(row.green) || !Array.isArray(row.red)) {
    problems.push(`${where}: green/red must both be arrays`)
    continue
  }
  if (row.green.length !== row.red.length) {
    problems.push(`${where}: green has ${row.green.length} entries, red has ${row.red.length}`)
    continue
  }
  // The agents-died signature. A genuine 0/0 is possible but vanishingly rare, and
  // recording one as fact would bake a false floor into the gate forever.
  if (!row.green.some(Boolean) && !row.red.some(Boolean)) {
    problems.push(`${where}: all-false in BOTH arms — the agents-died signature, not a result`)
    continue
  }
  const { n, err } = assertionCount(skill, key)
  if (err) {
    problems.push(`${where}: ${err}`)
    continue
  }
  if (n !== row.green.length) {
    problems.push(
      `${where}: MISALIGNED — row has ${row.green.length} verdicts but evals.json now has ${n} ` +
        `assertions. The assertion list changed; re-run this case, do not merge it.`
    )
    continue
  }
  if (typeof row.k !== 'number' || row.k < 1) {
    problems.push(`${where}: missing or invalid k`)
    continue
  }
  const prev = baseline.skills[skill]?.[key]
  if (prev && prev.green.length !== row.green.length)
    problems.push(`${where}: baseline row has ${prev.green.length} verdicts, incoming has ${row.green.length}`)
  plan.push({ skill, key, row: { ...row, model: opts.model }, prev })
}

if (problems.length) {
  console.error(`refusing to merge — ${problems.length} problem(s):`)
  for (const p of problems) console.error(`  ${p}`)
  process.exit(1)
}

const degraded = plan.filter((p) => p.row.k < (resultsFile.baseline?.k ?? Math.max(...plan.map((x) => x.row.k))))
if (degraded.length && !opts.allowDegraded) {
  console.error(`refusing to merge — ${degraded.length} row(s) voted fewer rounds than the run targeted:`)
  for (const d of degraded) console.error(`  ${d.skill} ${d.key} (k=${d.row.k})`)
  console.error('Resume the run (resumeFromRunId) to fill them in, or pass --allow-degraded to accept them.')
  process.exit(1)
}

// The control arm is supposed to load no skill, and nothing structurally enforces
// it — the prompt is the only lever. A row whose RED rounds loaded the skill under
// test is not a control and must not be recorded as one. Cross-skill loads are
// reported and allowed through: a bare model that solves the task by routing to a
// sibling is evidence about redundancy, not contamination.
if (opts.transcripts) {
  const scan = scanRun(opts.transcripts, { cases: loadCases(opts.skillsDir) })
  const dirty = new Set(scan.contaminated.map((c) => c.case).filter(Boolean))
  const hit = plan.filter((p) => dirty.has(`${p.skill} ${p.key}`))
  console.log(
    `leak scan (${opts.transcripts}): ${scan.redGens} RED / ${scan.greenGens} GREEN generators, ` +
      `${scan.contaminated.length} same-skill load(s), ${scan.crossSkill.length} cross-skill, ` +
      `${scan.forked.length} fork call(s), ${scan.unattributed.length} unattributed`
  )
  for (const c of scan.crossSkill) console.log(`  cross-skill (redundancy signal): ${c.skill} loaded on ${c.case}`)
  if (scan.unattributed.length)
    console.warn(`warning: ${scan.unattributed.length} load(s) match no current case prompt — prompts changed since the run.`)
  if (hit.length && !opts.allowContaminated) {
    console.error(`refusing to merge — ${hit.length} row(s) whose control arm loaded the skill under test:`)
    for (const h of hit) console.error(`  ${h.skill} ${h.key}`)
    console.error('Re-run those rows, or pass --allow-contaminated to record them anyway.')
    process.exit(1)
  }
  if (hit.length) console.warn(`warning: merging ${hit.length} contaminated row(s) on --allow-contaminated`)
}

// ------------------------------------------------------------------- report

let gained = 0
let lostGate = []
let newRows = 0

for (const { skill, key, row, prev } of plan) {
  if (!prev) {
    newRows++
    continue
  }
  for (let i = 0; i < row.green.length; i++) {
    if (!prev.green[i] && row.green[i]) gained++
    // run.py fails on exactly this: was green, now red. Not a bug here — a k=3
    // measurement supersedes a k=1 one — but each is gate coverage being given up.
    if (prev.green[i] && !row.green[i]) lostGate.push(`${skill} ${key} assertion #${i}`)
  }
}

// Assertions the skill wins and the control loses. This — not GREEN, and not the
// GREEN-RED total — is what the row actually measures: a row that discriminates on
// one assertion is one judge call away from measuring nothing, and a row at zero
// measures nothing already. Saturation costs LIFT MEASUREMENT, not gate coverage
// (run.py compares GREEN only), so this is a suite-health readout, not a gate.
const discriminating = (row) => {
  const at = []
  for (let i = 0; i < row.green.length; i++) if (row.green[i] && !row.red[i]) at.push(`#${i}`)
  return at
}

console.log(`merging ${plan.length} row(s) into ${opts.baseline}`)
for (const { skill, key, row, prev } of plan) {
  const g = row.green.filter(Boolean).length
  const r = row.red.filter(Boolean).length
  const was = prev ? `was GREEN ${prev.green.filter(Boolean).length}/${prev.green.length} (k=${prev.k})` : 'NEW'
  console.log(`  ${skill} ${key}: GREEN ${g}/${row.green.length} RED ${r}/${row.red.length} (k=${row.k}) — ${was}`)
  const at = discriminating(row)
  const before = prev ? ` (was ${discriminating(prev).length})` : ''
  const note = at.length === 0 ? ' — measures no lift' : at.length === 1 ? ' — single-assertion margin' : ''
  console.log(`      discriminates on ${at.length}${before}: ${at.join(' ') || '(none)'}${note}`)
}
console.log(`\nassertions newly green: ${gained}`)
console.log(`gate coverage given up (was green, now red): ${lostGate.length}`)
for (const l of lostGate) console.log(`  ${l}`)
if (newRows) console.log(`rows that are new cases (not replacements): ${newRows}`)

// -------------------------------------------------------------------- merge

for (const { skill, key, row } of plan) {
  baseline.skills[skill] ??= {}
  // Field order matches the existing rows so the diff stays minimal.
  baseline.skills[skill][key] = {
    green: row.green,
    red: row.red,
    model: opts.model,
    k: row.k,
    runner: row.runner ?? 'workflow-runner.mjs',
  }
}

// Recompute the summary from ALL rows — including `skills`, which the runner never
// emits and which was hand-added to the committed file.
let cases = 0
let assertions = 0
let redTrue = 0
let greenTrue = 0
for (const byCase of Object.values(baseline.skills))
  for (const row of Object.values(byCase)) {
    cases++
    assertions += row.green.length
    greenTrue += row.green.filter(Boolean).length
    redTrue += row.red.filter(Boolean).length
  }
baseline.summary = {
  cases,
  excluded: baseline.summary?.excluded ?? 0,
  assertions,
  red: redTrue,
  green: greenTrue,
  skills: Object.keys(baseline.skills).length,
}

// Top-level k is a human-readable summary; k is authoritative PER ROW.
const kCounts = new Map()
for (const byCase of Object.values(baseline.skills))
  for (const row of Object.values(byCase)) kCounts.set(row.k, (kCounts.get(row.k) ?? 0) + 1)
const sortedK = [...kCounts.entries()].sort((a, b) => b[1] - a[1])
baseline.k =
  sortedK.length === 1
    ? String(sortedK[0][0])
    : `${sortedK[0][0]}, except ${sortedK
        .slice(1)
        .map(([k, n]) => `${n} cases at ${k}`)
        .join(' and ')}`

if (opts.note) {
  const note = opts.note.trim()
  // Idempotence extends to the note: re-merging the same results must not append
  // the same coverage sentence a second time.
  if ((baseline._note ?? '').includes(note)) {
    console.log('_note already records this run — not appending again')
  } else {
    const paras = (baseline._note ?? '').split('\n\n')
    const i = paras.findIndex((p) => p.startsWith('COVERAGE'))
    if (i === -1) {
      console.warn('warning: no COVERAGE paragraph in _note; appending the note as a new paragraph')
      paras.push(note)
    } else {
      paras[i] = `${paras[i].trimEnd()} ${note}`
    }
    baseline._note = paras.join('\n\n')
  }
} else {
  console.warn('warning: no --note given — the _note coverage log will not record this run.')
}

console.log(
  `\nsummary: ${cases} cases, ${assertions} assertions, red ${redTrue}, green ${greenTrue}, ` +
    `${baseline.summary.skills} skills; k = "${baseline.k}"`
)

// -------------------------------------------------------------------- write

const serialize = (obj) =>
  JSON.stringify(obj, null, 2).replace(NON_ASCII, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')) + '\n'

const out = serialize(baseline)

if (opts.dryRun) {
  console.log(`\n--dry-run: nothing written (would write ${out.length} bytes to ${opts.out})`)
  process.exit(0)
}

const before = fs.existsSync(opts.out) ? fs.readFileSync(opts.out, 'utf8') : null
if (before === out) {
  console.log(`\n${opts.out} already up to date — no write needed (idempotent re-merge)`)
  process.exit(0)
}
fs.writeFileSync(opts.out, out)
console.log(`\nwrote ${opts.out} (${out.length} bytes)`)
