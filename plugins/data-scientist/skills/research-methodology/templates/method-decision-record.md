# Method Decision Record Template

One per method choice that shapes a result. Like an ADR, but the evidence is
data and literature rather than system constraints. Save as
`docs/methods/MDR-NNNN-<topic>.md`.

```markdown
# MDR-NNNN: [the question, e.g. "How to group building footprints into homesteads"]

**Status:** Proposed | Accepted | Superseded by MDR-NNNN
**Date:** YYYY-MM-DD
**Used by:** [phase / work package / experiments]

## Question
[What has to be decided, and which results depend on it.]

## Candidates
| Candidate | How it works (one line) | Evidence for | Evidence against | Sources |
|---|---|---|---|---|
| [e.g. DBSCAN] | | | | [DOI / arXiv] |
| [e.g. single-linkage with distance cut] | | | | |
| [e.g. alpha shapes per cluster] | | | | |

## Instrument validity
[Was each candidate (or the product/model it relies on) built and evaluated for
this variable and this setting? If not, what does that limit?]

## Criteria
[How candidates are compared: accuracy on what, cost, interpretability,
parameter sensitivity. Set before comparing.]

## Decision
[The choice and the reason, in a few sentences. Parameters and how they were set.]

## Alternatives to try later
[Candidates not chosen that would be worth testing if the result is weak, with
what would trigger trying them.]

## Consequences
[What this decision commits the project to; which claims inherit its limits.]
```
