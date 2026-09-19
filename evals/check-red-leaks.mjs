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
// reply: that is fatal for the row. A judge call that reaches beyond the reply
// otherwise (grepping a SKILL.md to check a claim) is a protocol breach worth
// reporting, not fatal. Pure computation over the reply — counting a drafted
// description's characters — is allowed: it judges the reply more accurately rather
// than looking past it. Judges are attributed to a row by the prompt they quote
// after "under pressure:".
//
// Exit 1 if RED loaded the body of the skill under test (or an unattributable
// body), or if a judge read an answer key; exit 0 for cross-skill loads, fork
// calls, non-loading RED tool use, and other judge tool use.
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'

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
// reply alone. `.local/` counts with it: the run's brief, payload, results and
// handback live there, and they carry each case's assertions, which assertion a
// batch just added, and the hypothesis the batch is testing. A judge that opens one
// is scoring with the question in hand — measured once, when three judges read a
// brief that named the new assertion on every row it was scoring.
const ANSWER_KEY = /evals\.json|expected_output|(^|[^\w])\.local\//

// A shell command reaches beyond the quoted reply unless it is computation over
// literal text — counting a drafted description's characters, or running the reply's
// own code — which judges the reply more accurately rather than looking past it.
// Judges do that computation in their scratch space: a heredoc or inline script
// written under /tmp and run. So the command is read, not pattern-matched: script
// bodies are set aside and checked for file, process or network APIs, and every
// remaining simple command must be a compute verb touching no path outside /tmp.
const SCRIPT_REACHES_OUT = /readFileSync|readdirSync|readFile\b|\bopen\(|child_process|subprocess|\bos\.(system|popen|listdir|walk)|pathlib|\bglob\b|\bfetch\(|urllib|requests\.|\bexecSync\b|\bspawn/
const COMPUTE = new Set(['node', 'python', 'python3', 'cat', 'printf', 'echo', 'wc', 'mkdir', 'cd', 'true'])
const SCRATCH = /^(\/tmp(\/|$)|\/dev\/null$)/

// Splits a command into simple commands of words, lifting heredoc and quoted
// bodies out as `scripts`. Unbalanced quoting returns null: unreadable is reported.
const parseShell = (command) => {
  const segments = [[]]
  const scripts = []
  const heredocs = []
  let i = 0
  const n = command.length
  while (i < n) {
    const ch = command[i]
    if (ch === '\n') {
      for (const delim of heredocs.splice(0)) {
        const end = command.indexOf(`\n${delim}\n`, i) >= 0 ? command.indexOf(`\n${delim}\n`, i)
          : command.endsWith(`\n${delim}`) ? n - delim.length - 1 : -1
        if (end < 0) return null
        scripts.push(command.slice(i + 1, end))
        i = end + delim.length + 1
      }
      segments.push([])
      i++
    } else if (/\s/.test(ch)) i++
    else if (/[;|&]/.test(ch)) {
      segments.push([])
      i += command.startsWith('&&', i) || command.startsWith('||', i) ? 2 : 1
    } else if (command.startsWith('<<', i)) {
      const m = /^<<-?\s*(['"]?)(\w+)\1/.exec(command.slice(i))
      if (!m) return null
      heredocs.push(m[2])
      i += m[0].length
    } else {
      let word = ''
      let quoted = false
      // `&` directly after a redirect (`2>&1`) belongs to the word, not a separator.
      while (i < n && !/[\s;|]/.test(command[i]) && !(command[i] === '&' && !/[<>]$/.test(word))) {
        const q = command[i]
        if (q === "'" || q === '"') {
          let j = i + 1
          while (j < n && command[j] !== q) j += q === '"' && command[j] === '\\' ? 2 : 1
          if (j >= n) return null
          word += command.slice(i + 1, j)
          quoted = true
          i = j + 1
        } else word += command[i++]
      }
      if (word) segments.at(-1).push({ word, quoted })
    }
  }
  return { segments: segments.filter((s) => s.length), scripts }
}

const reachesOut = (command) => {
  const parsed = parseShell(command)
  if (!parsed) return true
  for (const s of parsed.scripts) if (SCRIPT_REACHES_OUT.test(s)) return true
  for (const words of parsed.segments) {
    const [verb, ...args] = words
    if (!COMPUTE.has(verb.word)) return true
    for (const [k, { word, quoted }] of args.entries()) {
      // An inline script body (`node -e`, `python3 -c`) is code, not a path.
      if (quoted && ['-e', '-c'].includes(args[k - 1]?.word)) {
        if (SCRIPT_REACHES_OUT.test(word)) return true
        continue
      }
      if (quoted || word.startsWith('-') || /^\d*[<>]+&?\d*$/.test(word)) continue
      const target = word.replace(/^\d*[<>]+&?/, '')
      if (SCRATCH.test(target)) continue
      // Outside scratch space, a path or file name is the thing being detected, and
      // any operand `cat` is not writing to is a file it reads.
      const writes = /^\d*>/.test(word) || /^\d*>+$/.test(args[k - 1]?.word ?? '')
      if (target.includes('/') || /\.\w+$/.test(target) || (verb.word === 'cat' && !writes)) return true
    }
  }
  return false
}

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
      if (b?.type === 'tool_use' && b.name !== 'StructuredOutput')
        calls.push({ tool: b.name, input: JSON.stringify(b.input ?? {}), command: typeof b.input?.command === 'string' ? b.input.command : null })
  }
  if (!calls.length) return
  const c = attribute(promptText, byPrompt, 'under pressure:\n')
  for (const { tool, input, command } of calls) {
    const rec = { agent: f, tool, input: input.slice(0, 150), case: c ? `${c.skill} ${c.key}` : null }
    if (ANSWER_KEY.test(input)) out.judgeAnswerKey.push(rec)
    // Every tool but a shell reads, searches or fetches by definition.
    else if (tool !== 'Bash' || command === null || reachesOut(command)) out.judgeToolUse.push(rec)
    else out.judgeCompute.push(rec)
  }
}

export const scanRun = (dir, { skillsDir = 'skills', cases } = {}) => {
  const { byPrompt, fork } = cases ?? loadCases(skillsDir)
  const out = {
    dir, redGens: 0, greenGens: 0, contaminated: [], crossSkill: [], forked: [], unattributed: [], otherToolUse: [],
    judges: 0, judgeAnswerKey: [], judgeToolUse: [], judgeCompute: [],
    listings: {}, redWithoutListing: 0,
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
    let listing = null
    for (const line of raw.split('\n')) {
      let d
      try { d = JSON.parse(line) } catch { continue }
      if (d?.attachment?.type === 'skill_listing') listing = (listing ?? '') + d.attachment.content
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
    if (listing === null) out.redWithoutListing++
    else {
      const hash = createHash('sha256').update(listing).digest('hex').slice(0, 12)
      out.listings[hash] = (out.listings[hash] ?? 0) + 1
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

// LISTING DRIFT. A control routes on the skill descriptions its session listed, and
// which skills are listed in full rather than by name varies between sessions with
// no change to the repo — one unchanged prompt's control named the sibling skill in
// 0 of 5 rounds in one session and 5 of 5 in the next. A row stores the hash of the
// listing its controls saw, so a later run can say whether a RED difference could be
// the listing rather than the skill. `listings` is scanRun's hash -> control count.
export const listingDrift = (prevHash, listings) => {
  const hashes = Object.keys(listings)
  if (hashes.length === 0) return { hash: null, drift: false, reason: 'no listing in the transcripts' }
  if (hashes.length > 1) return { hash: null, drift: true, reason: `controls in this run saw ${hashes.length} different listings` }
  const [hash] = hashes
  if (!prevHash) return { hash, drift: false, reason: 'no previous listing recorded' }
  return hash === prevHash ? { hash, drift: false, reason: 'same listing' } : { hash, drift: true, reason: 'listing changed since the last measurement' }
}

export const rowsToRerun = (r) => [...new Set([...r.contaminated, ...(r.judgeAnswerKey ?? [])].map((c) => c.case).filter(Boolean))]

// ------------------------------------------------------------------- self-test
// Runs against committed fixtures with a stub skills tree, so it proves the
// classification on every platform without depending on machine-local workflow
// transcripts (those age off disk) or on any real case prompt staying unedited.
const FIXTURES = 'evals/fixtures/red-leaks'
const NO_JUDGE = { judges: 0, judgeAnswerKey: 0, judgeToolUse: 0, judgeCompute: 0 }
const EXPECT = {
  'same-skill': { contaminated: 1, crossSkill: 0, forked: 0, otherToolUse: 0, redGens: 1, greenGens: 0, ...NO_JUDGE, exit: 1 },
  'cross-skill': { contaminated: 0, crossSkill: 1, forked: 0, otherToolUse: 0, redGens: 1, greenGens: 0, ...NO_JUDGE, exit: 0 },
  fork: { contaminated: 0, crossSkill: 0, forked: 1, otherToolUse: 0, redGens: 1, greenGens: 0, ...NO_JUDGE, exit: 0 },
  clean: { contaminated: 0, crossSkill: 0, forked: 0, otherToolUse: 0, redGens: 1, greenGens: 1, ...NO_JUDGE, judges: 1, listings: 0, redWithoutListing: 1, exit: 0 },
  'other-tool-use': { contaminated: 0, crossSkill: 0, forked: 0, otherToolUse: 1, redGens: 1, greenGens: 0, ...NO_JUDGE, exit: 0 },
  // A judge that opens the case's evals.json has read the answer key: the
  // expected_output the generator never saw. That verdict is not a judgment of the
  // reply, so the row it voted on is not a measurement.
  'judge-answer-key': { contaminated: 0, crossSkill: 0, forked: 0, otherToolUse: 0, redGens: 0, greenGens: 0, ...NO_JUDGE, judges: 1, judgeAnswerKey: 1, exit: 1 },
  // A judge that greps a skill file is checking the reply against the repo rather
  // than judging the reply alone. A protocol breach worth reporting, not fatal.
  'judge-other-tool': { contaminated: 0, crossSkill: 0, forked: 0, otherToolUse: 0, redGens: 0, greenGens: 0, ...NO_JUDGE, judges: 1, judgeToolUse: 1, exit: 0 },
  // A judge that computes over the quoted reply — counting a drafted description's
  // characters — is judging the reply more accurately, not looking beyond it. Allowed.
  'judge-compute': { contaminated: 0, crossSkill: 0, forked: 0, otherToolUse: 0, redGens: 0, greenGens: 0, ...NO_JUDGE, judges: 1, judgeCompute: 1, exit: 0 },
  // The same computation written to a scratch file and run — the reply's refactored
  // function executed against the original, a drafted description counted. Paths
  // under /tmp are the judge's own scratch space, not the repo.
  // The run's own brief, payload and results sit in .local/: they name each case's
  // assertions, which one is new, and the hypothesis under test. A judge that reads
  // them is scoring with the question in hand, so it counts with the answer key.
  'judge-work-area': { contaminated: 0, crossSkill: 0, forked: 0, otherToolUse: 0, redGens: 0, greenGens: 0, ...NO_JUDGE, judges: 2, judgeAnswerKey: 2, exit: 1 },
  'judge-compute-scratch': { contaminated: 0, crossSkill: 0, forked: 0, otherToolUse: 0, redGens: 0, greenGens: 0, ...NO_JUDGE, judges: 1, judgeCompute: 8, exit: 0 },
  // Repo reads stay reported however they are wrapped: a cd into /tmp first, a file
  // API inside an inline script, or a scratch run chained to a read.
  'judge-reach-out': { contaminated: 0, crossSkill: 0, forked: 0, otherToolUse: 0, redGens: 0, greenGens: 0, ...NO_JUDGE, judges: 1, judgeToolUse: 8, exit: 0 },
  // A control routes on whatever skill descriptions its session listed, and that
  // listing is not fixed between sessions. Each distinct listing the controls saw is
  // one hash; a control with no listing attachment contributes none.
  'listing-drift': { contaminated: 0, crossSkill: 0, forked: 0, otherToolUse: 0, redGens: 2, greenGens: 0, ...NO_JUDGE, listings: 2, redWithoutListing: 0, exit: 0 },
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
      judgeCompute: r.judgeCompute?.length,
      listings: r.listings && Object.keys(r.listings).length, redWithoutListing: r.redWithoutListing,
      exit: r.contaminated.length + r.unattributed.length + (r.judgeAnswerKey?.length ?? 0) ? 1 : 0,
    }
    const bad = Object.keys(want).filter((k) => got[k] !== want[k])
    if (bad.length) {
      failed++
      console.error(`FAIL ${name}: ${bad.map((k) => `${k} want ${want[k]} got ${got[k]}`).join(', ')}`)
    } else console.log(`ok   ${name}`)
  }
  // Drift between a row's previous measurement and this run's listing.
  const DRIFT = [
    ['first measurement', undefined, { h1: 4 }, { hash: 'h1', drift: false, reason: 'no previous listing recorded' }],
    ['same listing', 'h1', { h1: 4 }, { hash: 'h1', drift: false, reason: 'same listing' }],
    ['changed listing', 'h1', { h2: 4 }, { hash: 'h2', drift: true, reason: 'listing changed since the last measurement' }],
    ['mixed run', 'h1', { h1: 2, h2: 2 }, { hash: null, drift: true, reason: 'controls in this run saw 2 different listings' }],
    ['no listing seen', 'h1', {}, { hash: null, drift: false, reason: 'no listing in the transcripts' }],
  ]
  for (const [name, prev, listings, want] of DRIFT) {
    const got = listingDrift(prev, listings)
    if (JSON.stringify(got) !== JSON.stringify(want)) {
      failed++
      console.error(`FAIL listingDrift ${name}: want ${JSON.stringify(want)} got ${JSON.stringify(got)}`)
    } else console.log(`ok   listingDrift ${name}`)
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
  const hashes = Object.entries(r.listings)
  console.log(`Skill listing seen by RED: ${hashes.map(([h, n]) => `${h} (${n})`).join(', ') || 'none recorded'}` +
    (r.redWithoutListing ? `   ${r.redWithoutListing} RED generator(s) without one` : ''))
  if (hashes.length > 1) {
    console.log(`\nNote — controls in this run saw ${hashes.length} different skill listings. A control routes on the`)
    console.log(`descriptions it was shown, so RED verdicts on routing assertions are not comparable across them.`)
  }

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
  console.log(`Judges: ${r.judges}   (${r.judgeCompute.length} computation call(s) over the reply — allowed)`)
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
