#!/usr/bin/env node
// Compare content-eval rows across models, case by case.
//
//   node evals/compare-models.mjs evals/baseline.claude-haiku-5-5.json evals/baseline.claude-sonnet-5-5.json \
//        [--ref evals/baseline.json] [--set pilot=<cases.txt>] [--set unbiased=<cases.txt>]
//
// The reference (default evals/baseline.json, the Opus rows) and each model file
// share evals/baseline.json's shape. Only cases present in the reference AND every
// listed file are compared, so every model is scored on the same assertions.
// A --set file lists one case per line as "<skill> <kind>:<id>"; each set is reported
// separately, which keeps a hand-picked pilot from being averaged into an unbiased
// sample. With no --set, all shared cases form one set.
//
// Per model it prints RED and GREEN pass rates, the gain (GREEN - RED), how GREEN
// compares with the reference's RED (does the model WITH the skill reach the
// reference WITHOUT it?) and GREEN, and every case where the skill lowered a score.
// Pass rates are pooled over assertions; the 95% intervals come from resampling
// whole CASES (assertions inside one case move together), with a fixed seed so a
// rerun prints the same numbers. Eval and pressure cases are also shown apart.
// The reference rows are split by their recorded model id, because rows on
// different ids were judged by different models.
//
// Read-only: it never writes a file.

import fs from 'node:fs'

const argv = process.argv.slice(2)
const files = []
const sets = []
let ref = 'evals/baseline.json'
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (a === '--ref') ref = argv[++i]
  else if (a === '--set') {
    const [name, file] = String(argv[++i]).split('=')
    if (!file) die('--set needs name=<file>')
    sets.push({ name, file })
  } else if (a === '-h' || a === '--help') {
    console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 23).join('\n'))
    process.exit(0)
  } else if (a.startsWith('-')) die(`unknown flag ${a}`)
  else files.push(a)
}
if (!files.length) die('give at least one model baseline file. See --help.')

function die(msg) {
  console.error(`error: ${msg}`)
  process.exit(1)
}

const load = (p) => {
  if (!fs.existsSync(p)) die(`not found: ${p}`)
  const b = JSON.parse(fs.readFileSync(p, 'utf8'))
  if (!b.skills) die(`${p} has no "skills" object`)
  return b
}
const refB = load(ref)
const models = files.map((f) => ({ file: f, b: load(f) }))
const id = (s, k) => `${s} ${k}`
const rowOf = (b, cid) => {
  const [s, k] = cid.split(' ')
  return b.skills[s]?.[k]
}

// Cases every file has, with matching assertion counts.
const shared = []
for (const [s, byCase] of Object.entries(refB.skills))
  for (const [k, r] of Object.entries(byCase)) {
    const cid = id(s, k)
    const ok = models.every(({ b }) => {
      const m = rowOf(b, cid)
      return m && m.green.length === r.green.length
    })
    if (ok) shared.push(cid)
  }

const setList = sets.length
  ? sets.map(({ name, file }) => {
      const want = fs.readFileSync(file, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
      const missing = want.filter((c) => !shared.includes(c))
      return { name, cases: want.filter((c) => shared.includes(c)), missing }
    })
  : [{ name: 'all shared cases', cases: shared, missing: [] }]

// Seeded PRNG (mulberry32) so the bootstrap is reproducible.
const rng = (seed) => () => {
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const B = 2000
const count = (a) => a.filter(Boolean).length

// stat(cases) -> a number in points; returns [point, lo, hi] over case resamples.
const boot = (cases, stat) => {
  const point = stat(cases)
  const rand = rng(20261106)
  const xs = []
  for (let i = 0; i < B; i++) xs.push(stat(Array.from(cases, () => cases[Math.floor(rand() * cases.length)])))
  xs.sort((a, b) => a - b)
  return [point, xs[Math.floor(0.025 * B)], xs[Math.floor(0.975 * B)]]
}
const rate = (rows, arm) => {
  let t = 0
  let n = 0
  for (const r of rows) {
    t += count(r[arm])
    n += r[arm].length
  }
  return n ? (100 * t) / n : NaN
}
const fmt = ([p, lo, hi]) => `${p.toFixed(1).padStart(6)}  [${lo.toFixed(1)}, ${hi.toFixed(1)}]`

const report = (label, cases, mb) => {
  if (!cases.length) return
  // Each case carries its model row and its reference row, so a resample keeps them paired.
  const pairs = cases.map((c) => ({ c, m: rowOf(mb, c), r: rowOf(refB, c) }))
  const M = (arm) => (ps) => rate(ps.map((p) => p.m), arm)
  const R = (arm) => (ps) => rate(ps.map((p) => p.r), arm)
  const d = (f, g) => (ps) => f(ps) - g(ps)
  const n = pairs.reduce((a, p) => a + p.m.green.length, 0)
  console.log(`  ${label}: ${cases.length} cases, ${n} assertions`)
  console.log(`    RED                     ${fmt(boot(pairs, M('red')))}`)
  console.log(`    GREEN                   ${fmt(boot(pairs, M('green')))}`)
  console.log(`    gain (GREEN - RED)      ${fmt(boot(pairs, d(M('green'), M('red'))))}`)
  console.log(`    GREEN - ref RED         ${fmt(boot(pairs, d(M('green'), R('red'))))}`)
  console.log(`    GREEN - ref GREEN       ${fmt(boot(pairs, d(M('green'), R('green'))))}`)
  console.log(`    ref RED / GREEN         ${R('red')(pairs).toFixed(1)} / ${R('green')(pairs).toFixed(1)}`)
}

for (const set of setList) {
  console.log(`\n=== ${set.name} ===`)
  if (set.missing.length) console.log(`  not in every file (skipped): ${set.missing.join(', ')}`)
  if (!set.cases.length) {
    console.log('  no cases to compare')
    continue
  }
  const byRefModel = new Map()
  for (const c of set.cases) {
    const m = rowOf(refB, c).model ?? refB.model
    byRefModel.set(m, [...(byRefModel.get(m) ?? []), c])
  }
  for (const { file, b } of models) {
    console.log(`\n${b.model ?? file}${b.judge ? ` (judged by ${b.judge})` : ''}  vs  ref ${ref}`)
    report('all', set.cases, b)
    report('eval cases', set.cases.filter((c) => c.includes(' eval:')), b)
    report('pressure cases', set.cases.filter((c) => c.includes(' pressure:')), b)
    if (byRefModel.size > 1) for (const [m, cs] of byRefModel) report(`ref rows on ${m}`, cs, b)
    // Harm: any assertion RED passes and GREEN fails, and cases whose GREEN total is below RED's.
    const harm = []
    for (const c of set.cases) {
      const r = rowOf(b, c)
      const idx = r.red.map((x, i) => (x && !r.green[i] ? i : -1)).filter((i) => i >= 0)
      if (idx.length) harm.push(`${c} [${idx.join(',')}]${count(r.green) < count(r.red) ? ' (case GREEN < RED)' : ''}`)
    }
    console.log(`  skill lowered an assertion: ${harm.length} case(s)${harm.length ? '\n    ' + harm.join('\n    ') : ''}`)
  }
}
