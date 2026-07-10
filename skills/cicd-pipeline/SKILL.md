---
name: cicd-pipeline
description: "Design CI/CD pipelines for automated build, test, deploy — GitHub Actions, GitLab CI, quality gates. Triggers: CI/CD, pipeline, GitHub Actions, GitLab CI, workflow, automated deployment, build pipeline, continuous integration, continuous deployment, automate tests on PR, deploy automatically, quality gate."
allowed-tools: Read, Grep, Glob, Write, Edit, Bash
---

# CI/CD Pipeline Design

Design and write CI/CD pipelines that automate build, test, and deployment with appropriate quality gates. Good pipelines are fast, reliable, and catch problems before they reach production.

## Workflow

### Step 1: Understand the Requirements

Before writing pipeline configuration, establish:

- **Platform**: GitHub Actions, GitLab CI, Jenkins, CircleCI, etc.
- **Triggers**: On push, on PR, on tag, on schedule, manual?
- **Stages needed**: Lint → Test → Build → Deploy? Security scan? Performance test?
- **Environments**: Staging, production? Approval gates between them?
- **Artifacts**: Docker images, npm packages, binaries? Where do they go?
- **Secrets**: What credentials are needed and how are they managed?

### Step 2: Design the Pipeline Stages

Follow the "fail fast" principle — cheapest and fastest checks run first:

```
1. Lint & Format    (seconds)     → Catch style issues immediately
2. Unit Tests       (seconds)     → Catch logic errors
3. Build            (minutes)     → Confirm it compiles/bundles
4. Integration Tests (minutes)    → Catch wiring issues
5. Security Scan    (minutes)     → Catch vulnerabilities
6. Deploy to Staging (minutes)    → Validate in real environment
7. Deploy to Prod   (minutes)     → With approval gate
```

Parallelize independent stages. Lint, unit tests, and security scans can run simultaneously.

**Multi-repo / deployment repo pattern:** If this service is part of a polyrepo with a deployment repo, the pipeline's deploy stages may update version pins in the deployment repo (via PR or `repository_dispatch`) rather than deploying directly to infrastructure. The deployment repo's own CI handles validation and promotion across environments. See `deployment-repo` for the orchestration pattern and `gitops-delivery` for automated cross-repo triggers.

### Step 3: Write the Configuration

Write the pipeline config for the target platform. Use [templates/github-actions.md](templates/github-actions.md) as a starting point for GitHub Actions PR validation and production deploy workflows, plus a GitLab CI equivalent.

Key best practices:
- **Cache dependencies** — Cache node_modules, pip packages, Go modules between runs
- **Pin action/image versions** — Use SHA hashes or exact tags, not `@latest` or `@main`
- **Minimize secrets scope** — Only expose secrets to the jobs that need them
- **Use matrix builds** — Test across Node versions, OS variants, or Python versions when applicable
- **Set timeouts** — Prevent stuck jobs from consuming runner minutes indefinitely
- **Reusable workflows** — Extract common patterns into shared workflow files

### Step 4: Add Quality Gates

Quality gates prevent bad code from advancing:

- **Required checks** — Tests and lint must pass before PR merge
- **Coverage thresholds** — Fail if coverage drops below the floor
- **Security scan** — Block deploys with critical vulnerabilities
- **Approval gates** — Require manual approval for production deploys
- **Smoke tests** — Automated health checks after deployment

### Step 5: Validate

- [ ] Pipeline triggers correctly on the intended events
- [ ] Failing tests actually block the pipeline (not just warnings)
- [ ] Secrets are not exposed in logs
- [ ] Cache is working (second run is faster)
- [ ] Deploy steps have appropriate environment protections
- [ ] Rollback mechanism exists

## Principles Applied

- **KISS**: Start with a single-file pipeline. Split into reusable workflows only when duplication appears.
- **DRY**: Extract repeated steps into composite actions or shared workflows.
- **Fail fast**: Order stages by speed and likelihood of failure.
- **YAGNI**: Don't add matrix builds across 5 Node versions if you only support one.

## Cross-Skill References

- `deployment-repo` — for multi-service systems, the deployment repo handles system-level CI (contract tests, E2E, promotion)
- `gitops-delivery` — pull-based delivery as an alternative to CI-driven `kubectl apply` / `helm upgrade`
- `deployment-checklist` — pre-deployment verification gates to incorporate into the pipeline
- `release-management` — the release stage itself: version bumps, changelog, tagging, publish gates, registry publishing (the pipeline automates what that skill decides)
- `security-audit` — security scanning stages and SAST/DAST integration
- `verification-before-completion` — run the proving commands locally before relying on the pipeline to catch failures
