# Traceability Template

The chain a reader follows from "why are we doing this" to "which code produced
this number", and back. Add it to the working agreement's Methodology section, or
as `docs/research-workflow.md` linked from there. Rename the paths to the project's.

```markdown
## The chain

methodology            WHY + WHAT: framework, phases, gates between phases
      │
roadmap                WHEN: phases and milestones, the gate each one must pass
      │
phase plan             TASKS: work packages → acceptance, experiment, status
      │                (status lives where the working agreement says)
method decisions       WHY THIS METHOD: candidates, evidence, decision, alternatives
      │
experiment README      ONE QUESTION: hypotheses and decision rule written before
      │                the run; results; decision; claims produced; how to reproduce
      ├── notebook       where we look and explain: plots, tables, interpretation
      └── src module     tested code for anything reused or reported
              │
          pipeline config + lock   what exactly ran: data hashes, code, parameters
              │
          metrics / reports        results (aggregates only if the data is sensitive)
              │
claims register        numbers we may quote, each linked to its experiment and status

## Which file answers what

| Question | Open |
|---|---|
| Why this approach, what are the phases? | methodology |
| Which phase are we in, what's next? | roadmap → phase plan |
| Why this method, what else could we try? | method decisions |
| What did we look at in the data? | the EDA experiment and its notebook |
| What was tested, found and decided? | the experiment README |
| How do I re-run it? | the experiment README's Reproduce section |
| Can I quote this number? | claims register |
| Where does this dataset come from, under what licence? | the data inventory / source registry |

## Notebooks and code

- **Notebooks** are where we look and explain. They read pipeline outputs and
  import from the package. Commit them in a diff-friendly form (e.g. jupytext).
- **The package** holds anything reused or reported, with tests. When a notebook
  cell becomes something we rely on, it moves into a module.
- **The pipeline** runs both, so a rendered notebook always matches the data and
  code it was produced from.
```
