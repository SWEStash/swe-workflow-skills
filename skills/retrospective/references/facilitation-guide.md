# Retrospective Facilitation Guide

## Choosing the Right Format

| Format | Best for | Duration | Energy level needed |
|--------|----------|----------|---------------------|
| Start/Stop/Continue | Regular sprint retros, established teams | 45 min | Low |
| 4Ls (Liked/Learned/Lacked/Longed for) | Teams that want to celebrate learning | 60 min | Medium |
| Sailboat | Teams stuck in a rut, need fresh perspective | 60 min | Medium |
| Timeline | Post-mortems, retrospecting on a long project | 90 min | High |
| DAKI (Drop/Add/Keep/Improve) | Retros focused on process improvement | 60 min | Medium |

---

## Format Details

### Sailboat

Draw a boat with:
- **Wind** (pushing us forward): What helped us move fast?
- **Anchors** (slowing us down): What slowed us down or held us back?
- **Rocks ahead** (risks): What might cause problems next sprint?
- **Sun/island** (destination): What's our goal or ideal state?

Works well for teams that have been doing Start/Stop/Continue for too long and need a fresh frame.

### 4Ls

- **Liked**: What did you enjoy or appreciate?
- **Learned**: What did you discover or understand better?
- **Lacked**: What was missing that would have helped?
- **Longed for**: What do you wish existed or had happened?

Good for teams that focus too much on problems — this format forces recognition of positives and learning.

### DAKI

- **Drop**: What should we stop doing entirely?
- **Add**: What new practice should we start?
- **Keep**: What's working well that we should protect?
- **Improve**: What's partially working that we should refine?

More action-oriented than Start/Stop/Continue. Useful when "stop doing X" conversations have been unproductive.

---

## Facilitation Techniques

### Silent brainstorming first

Before group discussion, have each person write items on sticky notes (or a virtual board) silently for 5 minutes. This:
- Prevents groupthink (early speakers don't anchor the group)
- Gives quieter team members equal voice
- Produces more diverse observations

Group similar items by theme before discussing. This keeps discussion focused.

### Dot voting for prioritization

After brainstorming, give each person 3-5 votes to allocate across items. They can put multiple votes on a single item if they feel strongly. Items with the most votes become the action item candidates.

This avoids long debates about prioritization — the votes speak for themselves.

### Timeboxing discussions

Announce timeboxes before discussion starts: "We have 10 minutes for this topic." Visible timers help. When time is up, call for action items or explicitly decide to defer.

Without timeboxes, retros consistently over-run and end without action items.

---

## Handling Difficult Conversations

### When blame starts creeping in

Redirect with process questions: "What made it easy for that to happen?" or "What would have made it impossible?" This shifts from "Dave deployed bad code" to "our process allowed unreviewed code to reach production."

If blame persists: "Let's focus on what we'll do differently, not what was done wrong. What change would prevent this from happening again?"

### When the same issues recur every sprint

Two possibilities: the action items weren't done, or they were done but didn't solve the root cause.

For action items not done: "We committed to X last sprint. It didn't happen — why? Is this actually important? If yes, what needs to change to make it happen?"

For recurring issues after attempted fixes: Use 5 Whys to dig deeper. The real root cause may be one level below what was addressed.

### When a senior person dominates

Structure prevents domination more reliably than asking people to hold back. Silent brainstorming first (see above) equalizes input. Go-around techniques ("let's hear from everyone in turn on this") give quieter voices explicit space.

### When there's nothing to discuss

Low-energy or "everything was fine" retros usually mean one of:
- The team is burned out and needs a shorter session
- Trust hasn't been established for candor
- The sprint genuinely went well (celebrate it!)

For trust issues: Build psychological safety over time by modeling vulnerability: "I'll go first — something I struggled with this sprint was..."

### When a retro produces only complaints with no solutions

Require the action item proposal to come from the same person who raised the issue: "You raised this — what one specific thing could we do next sprint to improve it?" This is uncomfortable but effective. Venting without ownership produces nothing.

---

## Action Item Quality

Good action items:
- One owner (a named person, not "the team" or "someone")
- Specific and verifiable ("Add linting to CI by Friday" not "improve code quality")
- Realistic for one sprint
- Tracked: reviewed at the start of the next retro

Bad action items:
- "Be more careful with deployments" — not specific or verifiable
- "Team to improve test coverage" — no single owner, not measurable
- "Discuss X next sprint" — a meeting is not an improvement

If you can't make an action item specific and owned, it's not ready to commit to. Either refine it or drop it.

---

## Following Up on Previous Action Items

Always start the retro by reviewing last sprint's action items:
- "Was X completed? What was the outcome?"
- If not completed: "Was this actually important? If yes, carry it forward. If no, drop it."

Teams that never review previous action items learn that the retro produces no real change and stop engaging honestly.
