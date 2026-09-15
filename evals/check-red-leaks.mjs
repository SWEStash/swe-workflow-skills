#!/usr/bin/env node
// Scan a workflow run's transcripts for RED-arm SKILL LOADING, and for judges that
// looked beyond the reply they were given (see JUDGES below).
//
//   node evals/check-red-leaks.mjs <workflow-transcript-dir> [--skills-dir skills]
//   node evals/check-red-leaks.mjs --self-test        # committed fixtures, offline
//
// WHY. The A/B's treatment is "the skill is loaded", so the control arm must
// load none. GREEN loads it by READING THE FILE — greenGen says "You have an
// installed skill at <path>. First read that file" — which is why GREEN
// legitimately shows Read/cat against its own directory, and why GREEN never
// invokes the `Skill` tool. RED is only *told* to load nothing:
// workflow-runner.mjs spawns it as the default workflow subagent, and agent()
// exposes no tool-restriction option, so the prompt is the only lever.
//
// RED can acquire the skill by two routes, and neither is the same as "used a
// tool" — a RED round that runs `cat package.json` broke the protocol without
// acquiring any skill content:
//   1. invoking the `Skill` tool             -> the harness injects the body
//   2. reading skills/**/SKILL.md|references -> same content, via the filesystem
//
// Three distinctions decide whether a leak actually invalidates a row, and all
// three are measured rather than assumed:
//
//   * SAME-SKILL vs CROSS-SKILL. A RED round that loads the skill under test is
//     contamination — that round is effectively GREEN. A round that loads a
//     SIBLING is not: it is evidence about redundancy (if the bare model solves
//     the task by routing elsewhere, this skill may not earn its place), and on
//     a scope-boundary case routing to the sibling is arguably the right answer.
//     Reported, never fatal.
//   * FORK SKILLS INJECT NOTHING. A skill whose frontmatter says `context: fork`
//     launches a background agent and returns only "launched (forked execution,
//     running in the background)". The caller receives no body, so the round was
//     never contaminated. The set is read from the skills themselves rather than
//     hard-coded, so it stays correct when a skill's frontmatter changes.
//   * ATTRIBUTION. Which row a leaked round belongs to is recoverable only from
//     the RED prompt: agent-*.meta.json carries {agentType, spawnDepth, model}
//     and no label. redGen ends with `Developer: "<prompt>"`, and every case
//     prompt in the library is unique, so the prompt identifies the case. A
//     round whose prompt matches no current case is reported UNATTRIBUTED and
//     treated as fatal — the prompt has been edited since the run, so we cannot
//     prove the load was cross-skill.
//
// JUDGES. A judge is meant to score the quoted reply and nothing else, but it runs
// as a full-tool subagent too. A judge that opens an evals.json has the case's
// expected_output — the answer key — in hand, so its verdict does not measure the
// reply: that is fatal for the row. Any other judge tool call (grepping a SKILL.md
// to check a claim) is a protocol breach worth reporting, not fatal. Judges are
// attributed to a row by the prompt they quote after "under pressure:".
//
// Exit 1 if RED loaded the body of the skill under test (or an unattributable
// body), or if a judge read an answer key; exit 0 for cross-skill loads, fork
// calls, non-loading RED tool use, and other judge tool use.
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const GEN = "You are a coding assistant in a developer's terminal"
const JUDGE = 'You are a strict, skeptical evaluator'
const GREEN_TELL = 'You have an installed skill at'
const SKILL_FILE = /skills\/[\w.-]+\/(SKILL\.md|references\/|templates\/)/

// Every case in the library, keyed by its prompt. Both the fork flag and the
// prompt map come from the working tree, so the detector needs no payload and
// cannot drift from the skills it is checking.
export const loadCases = (skillsDir = 'skills') => {
  const byPrompt = new Map()
  const fork = new Set()
  for (const skill of readdirSync(skillsDir)) {
    const md = join(skillsDir, skill, 'SKILL.md')
    if (existsSync(md) && /^context:\s*fork\s*$/m.test(readFileSync(md, 'utf8'))) fork.add(skill)
    const f = join(skillsDir, skill, 'evals', 'evals.json')
    if (!existsSync(f)) continue
    let d
    try { d = JSON.parse(readFileSync(f, 'utf8')) } catch { continue }
    for (const [kind, list] of [['eval', d.evals], ['pressure', d.pressure_tests]])
      for (const c of list || []) if (c?.prompt) byPrompt.set(c.prompt, { skill, key: `${kind}:${c.id}` })
  }
  return { byPrompt, fork }
}

// The prompt is the only thing tying a transcript to a row. Longest-first so a
// prompt that is a prefix of another cannot claim the wrong case. Generators quote
// it after `Developer: `, judges after `under pressure:` (see workflow-runner.mjs).
const attribute = (text, byPrompt, lead = 'Developer: ') => {
  for (const [prompt, c] of [...byPrompt].sort((a, b) => b[0].length - a[0].length))
    if (text.includes(`${lead}"${prompt}"`)) return c
  return null
}

// A judge reading any evals.json has the assertions' expected_output in hand — the
// answer key the generator never saw. Its verdict is no longer a judgment of the
// reply alone.
const ANSWER_KEY = /evals\.json|expected_output/

// Judges must judge the quoted reply and nothing else. The schema's own
// StructuredOutput call is how a verdict is returned, so it is not tool use.
const scanJudge = (f, raw, byPrompt, out) => {
  out.judges++
  let promptText = ''
  const calls = []
  for (const line of raw.split('\n')) {
    let d
    try { d = JSON.parse(line) } catch { continue }
    const msg = d?.message
    if (msg?.role === 'user' && typeof msg.content === 'string') promptText += msg.content
    if (msg?.role !== 'assistant' || !Array.isArray(msg.content)) continue
    for (const b of msg.content)
      if (b?.type === 'tool_use' && b.name !== 'StructuredOutput') calls.push({ tool: b.name, input: JSON.stringify(b.input ?? {}) })
  }
  if (!calls.length) return
  const c = attribute(promptText, byPrompt, 'under pressure:\n')
  for (const { tool, input } of calls) {
    const rec = { agent: f, tool, input: input.slice(0, 150), case: c ? `${c.skill} ${c.key}` : null }
    ;(ANSWER_KEY.test(input) ? out.judgeAnswerKey : out.judgeToolUse).push(rec)
  }
}

export const scanRun = (dir, { skillsDir = 'skills', cases } = {}) => {
  const { byPrompt, fork } = cases ?? loadCases(skillsDir)
  const out = {
    dir, redGens: 0, greenGens: 0, contaminated: [], crossSkill: [], forked: [], unattributed: [], otherToolUse: [],
    judges: 0, judgeAnswerKey: [], judgeToolUse: [],
  }

  for (const f of readdirSync(dir).filter((n) => /^agent-.*\.jsonl$/.test(n))) {
    const raw = readFileSync(join(dir, f), 'utf8')
    // Judges quote the generator's prompt verbatim, so they match GEN too and
    // must be classified before anything else.
    if (raw.includes(JUDGE)) { scanJudge(f, raw, byPrompt, out); continue }
    if (!raw.includes(GEN)) continue
    if (raw.includes(GREEN_TELL)) { out.greenGens++; continue }
    out.redGens++

    const loads = []
    let promptText = ''
    for (const line of raw.split('\n')) {
      let d
      try { d = JSON.parse(line) } catch { continue }
      const msg = d?.message
      if (msg?.role === 'user' && typeof msg.content === 'string') promptText += msg.content
      if (msg?.role !== 'assistant' || !Array.isArray(msg.content)) continue
      for (const b of msg.content) {
        if (b?.type !== 'tool_use') continue
        const input = JSON.stringify(b.input ?? {})
        const rec = { agent: f, tool: b.name, input: input.slice(0, 150) }
        if (b.name === 'Skill') loads.push({ ...rec, via: 'Skill tool', skill: b.input?.skill })
        else if (SKILL_FILE.test(input)) loads.push({ ...rec, via: 'file read', skill: input.match(/skills\/([\w.-]+)\//)?.[1] })
        else out.otherToolUse.push(rec)
      }
    }
    if (!loads.length) continue

    const c = attribute(promptText, byPrompt)
    for (const l of loads) {
      const rec = { ...l, case: c ? `${c.skill} ${c.key}` : null }
      // Order matters: a fork call injects no body whatever skill it names, so
      // it is never contamination even when it names the skill under test.
      if (fork.has(l.skill)) out.forked.push(rec)
      else if (!c) out.unattributed.push(rec)
      else if (l.skill === c.skill) out.contaminated.push(rec)
      else out.crossSkill.push(rec)
    }
  }
  return out
}

export const rowsToRerun = (r) => [...new Set([...r.contaminated, ...(r.judgeAnswerKey ?? [])].map((c) => c.case).filter(Boolean))]

// ------------------------------------------------------------------- self-test
// Runs against committed fixtures with a stub skills tree, so it proves the
// classification on every platform without depending on machine-local workflow
// transcripts (those age off disk) or on any real case prompt staying unedited.
const FIXTURES = 'evals/fixtures/red-leaks'
const NO_JUDGE = { judges: 0, judgeAnswerKey: 0, judgeToolUse: 0 }
const EXPECT = {
  'same-skill': { contaminated: 1, crossSkill: 0, forked: 0, otherToolUse: 0, redGens: 1, greenGens: 0, ...NO_JUDGE, exit: 1 },
  'cross-skill': { contaminated: 0, crossSkill: 1, forked: 0, otherToolUse: 0, redGens: 1, greenGens: 0, ...NO_JUDGE, exit: 0 },
  fork: { contaminated: 0, crossSkill: 0, forked: 1, otherToolUse: 0, redGens: 1, greenGens: 0, ...NO_JUDGE, exit: 0 },
  clean: { contaminated: 0, crossSkill: 0, forked: 0, otherToolUse: 0, redGens: 1, greenGens: 1, judges: 1, judgeAnswerKey: 0, judgeToolUse: 0, exit: 0 },
  'other-tool-use': { contaminated: 0, crossSkill: 0, forked: 0, otherToolUse: 1, redGens: 1, greenGens: 0, ...NO_JUDGE, exit: 0 },
  // A judge that opens the case's evals.json has read the answer key: the
  // expected_output the generator never saw. That verdict is not a judgment of the
  // reply, so the row it voted on is not a measurement.
  'judge-answer-key': { contaminated: 0, crossSkill: 0, forked: 0, otherToolUse: 0, redGens: 0, greenGens: 0, judges: 1, judgeAnswerKey: 1, judgeToolUse: 0, exit: 1 },
  // A judge that greps a skill file is checking the reply against the repo rather
  // than judging the reply alone. A protocol breach worth reporting, not fatal.
  'judge-other-tool': { contaminated: 0, crossSkill: 0, forked: 0, otherToolUse: 0, redGens: 0, greenGens: 0, judges: 1, judgeAnswerKey: 0, judgeToolUse: 1, exit: 0 },
}

const selfTest = () => {
  const cases = loadCases(`${FIXTURES}/skills`)
  let failed = 0
  for (const [name, want] of Object.entries(EXPECT)) {
    const r = scanRun(`${FIXTURES}/${name}`, { cases })
    const got = {
      contaminated: r.contaminated.length, crossSkill: r.crossSkill.length, forked: r.forked.length,
      otherToolUse: r.otherToolUse.length, redGens: r.redGens, greenGens: r.greenGens,
      judges: r.judges, judgeAnswerKey: r.judgeAnswerKey?.length, judgeToolUse: r.judgeToolUse?.length,
      exit: r.contaminated.length + r.unattributed.length + (r.judgeAnswerKey?.length ?? 0) ? 1 : 0,
    }
    const bad = Object.keys(want).filter((k) => got[k] !== want[k])
    if (bad.length) {
      failed++
      console.error(`FAIL ${name}: ${bad.map((k) => `${k} want ${want[k]} got ${got[k]}`).join(', ')}`)
    } else console.log(`ok   ${name}`)
  }
  // The GREEN fixture reads its own SKILL.md, which is the mechanism working as
  // designed; a detector that flagged it would fail every honest run.
  console.log(failed ? `\n${failed} fixture(s) failed` : '\nOK — all fixtures classified as expected')
  process.exit(failed ? 1 : 0)
}

// ------------------------------------------------------------------------ CLI

if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2)
  let dir = null
  const opts = { skillsDir: 'skills' }
  if (argv[0] === '--self-test') selfTest()
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--skills-dir') opts.skillsDir = argv[++i]
    else if (argv[i].startsWith('-')) { console.error(`unknown flag ${argv[i]}`); process.exit(2) }
    else dir = argv[i]
  }
  if (!dir) { console.error('usage: check-red-leaks.mjs <workflow-transcript-dir> [--skills-dir skills] | --self-test'); process.exit(2) }

  const r = scanRun(dir, opts)
  const list = (rows) => rows.forEach((l) => console.log(`  [${l.via}] ${l.skill ?? '?'}  case=${l.case ?? 'UNATTRIBUTED'}  ${l.input}`))
  console.log(`RED generators: ${r.redGens}   GREEN generators: ${r.greenGens}`)

  if (r.forked.length) {
    console.log(`\nNote — ${r.forked.length} call(s) to a \`context: fork\` skill. These launch a background`)
    console.log(`agent and return no body, so the round was never contaminated; no re-run needed.`)
    list(r.forked)
  }
  if (r.crossSkill.length) {
    console.log(`\nNote — ${r.crossSkill.length} CROSS-SKILL load(s): RED solved the task by routing to a`)
    console.log(`sibling. Not contamination — this is redundancy signal about the skill under test.`)
    list(r.crossSkill)
  }
  if (r.otherToolUse.length) {
    console.log(`\nNote — ${r.otherToolUse.length} non-loading tool call(s) in RED (protocol violation, not`)
    console.log(`contamination — no skill content was acquired):`)
    r.otherToolUse.forEach((o) => console.log(`  ${o.tool}  ${o.input}`))
  }

  const judgeList = (rows) => rows.forEach((l) => console.log(`  ${l.tool}  case=${l.case ?? 'UNATTRIBUTED'}  ${l.input}`))
  console.log(`Judges: ${r.judges}`)
  if (r.judgeToolUse.length) {
    console.log(`\nNote — ${r.judgeToolUse.length} judge tool call(s) outside the verdict (the judge checked the`)
    console.log(`reply against the repo instead of judging the reply alone; not an answer-key read):`)
    judgeList(r.judgeToolUse)
  }

  const fatal = [...r.contaminated, ...r.unattributed]
  if (!fatal.length && !r.judgeAnswerKey.length) {
    console.log('\nOK — RED loaded no skill body under test, and no judge read an answer key')
    process.exit(0)
  }
  if (fatal.length) {
    console.log(`\nCONTAMINATED: RED loaded the skill under test in ${fatal.length} round(s) — those are not controls:`)
    list(fatal)
    if (r.unattributed.length) console.log('\n(UNATTRIBUTED rounds match no current case prompt — the prompt was edited since the run.)')
  }
  if (r.judgeAnswerKey.length) {
    console.log(`\nJUDGE READ THE ANSWER KEY in ${r.judgeAnswerKey.length} call(s) — those verdicts do not judge the reply:`)
    judgeList(r.judgeAnswerKey)
  }
  const rows = rowsToRerun(r)
  if (rows.length) console.log(`\nAffected rows: ${rows.join(', ')}`)
  console.log('\nDo NOT merge these rows: re-run them.')
  process.exit(1)
}
