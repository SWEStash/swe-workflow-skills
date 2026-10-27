# Source Verification

The rule: **cite only what you opened.**

## Trust tiers

- **Tier 1 — cite freely:** peer-reviewed papers and proceedings, standards,
  canonical books cited to chapter or section, primary documentation with a
  stated version or date (dataset cards, product technical reports, API docs).
- **Tier 2 — cite with attribution:** vendor engineering blogs and release notes
  (primary for the vendor's own product, marketing-adjacent for comparisons);
  public repositories, for what the code actually does; preprints, flagged as
  preprints.
- **Tier 3 — use to find, never to cite:** community blogs, aggregators, SEO
  pages, forum answers, model-generated summaries (including search snippets and
  WebFetch output). A fact found only in Tier 3 is not established.

## The identity rule

Every claim that carries weight must end at something with an identity: a DOI,
an arXiv ID, an ISBN with chapter or page, a standard's designation, a versioned
documentation URL, a dated release note, a commit SHA. Anything that cannot
resolve to an identity is Tier 3, whatever it looks like.

This catches the two common failures without having to judge pages:
- **Citogenesis** — a page repeats a claim and gets cited as if it made it.
  Follow it to the work that established it.
- **Fabricated references** — "Smith et al. 2019" that doesn't exist fails the
  moment you try to resolve it.

## Capture, then quote

A search snippet or WebFetch result is a summary written by a model, not the
source. Use it to decide what to open. Then capture the page or PDF to a file
(with its URL, fetch date and any version it states), read it, and quote from
the file. A quote should be findable in the captured copy.

For two-column PDFs, extract in reading order, or quotes will be interleaved
across columns.

## Proportionality

Scale the checking to the claim and the rigour level the project agreed:

- **Established results** don't need the original: a 1977 textbook result
  restated in a trusted recent work can be cited through that work. Chase the
  original when the claim is contested, load-bearing for your argument, or the
  later works disagree.
- **Single studies are evidence, not consensus.** When a key claim rests on one
  paper, check whether later work adopted it, and say so in the text.
- **Independent corroboration only:** sources that trace to one origin count as one.
- **Paywalled or unreachable sources:** list them as gaps with what each would
  support. Ask the user for a copy, or cite through a reachable work that
  reports it. Don't cite from the abstract alone as if from the paper.

## Auditing a deep-research report

Before reusing a report's citations:
1. List each cited claim and the source it points to.
2. Resolve each source's identity and tier. Tier 3 → find the primary or drop the claim.
3. Spot-check quotes against captured copies, starting with the claims the
   project's argument depends on.
4. Record what was verified, what is a preprint, and what remains a gap.

## When verification fails

Cut the claim, or narrow it to what the evidence supports. A weaker claim that
holds is worth more than a strong one that doesn't.
