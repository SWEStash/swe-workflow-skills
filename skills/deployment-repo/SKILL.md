---
name: deployment-repo
description: "Design a deployment (GitOps) repo that orchestrates multiple services in a polyrepo — version pinning, environment promotion, compatibility matrices, system config. Triggers: deployment repo, GitOps repo, polyrepo, multi-repo, version pinning, compatibility matrix, environment promotion, multi-service deployment, orchestration repo, which versions work together."
allowed-tools: Read, Grep, Glob, Write, Edit, Bash
---

# Deployment Repository Design

The deployment repo is the single source of truth for how a distributed system is composed. Individual app repos answer "where does service X live?" — the deployment repo answers "where does the system live?"

## Step 1: Assess the System

Before designing the repo, map the landscape:

- **Services**: How many repos, what each service does, what language/framework
- **Communication**: How services talk (REST, gRPC, events/queues, shared database)
- **Team structure**: One team owns everything vs. multiple teams with service ownership
- **Current deployment**: How are services deployed today? Manual, CI-driven, ad hoc?
- **Environments**: Local dev, staging, production? More?

**Determine scale tier:**

| Tier | Team size | Services | Recommended tooling |
|------|-----------|----------|-------------------|
| **Lightweight** | 1 team | 2-5 | docker-compose, Makefile, `.env` files |
| **Standard** | 2-3 teams | 5-15 | Helm or Kustomize, CI-driven promotion |
| **Enterprise** | Many teams | 15+ | Helm + ArgoCD/Flux, automated promotion, audit trails |

Start at the lightest tier that fits. You can graduate up — premature complexity is worse than growing into it.

## Step 2: Design the Repo Structure

The deployment repo contains everything needed to compose, deploy, and validate the full system. See [references/deployment-repo-patterns.md](references/deployment-repo-patterns.md) for detailed structures per tier and [templates/deployment-repo-structure.md](templates/deployment-repo-structure.md) for scaffolding.

**Core directories (all tiers):**

```
deployment-repo/
├── versions.yaml              # Compatible service versions (the compatibility lock)
├── docker-compose.yml         # Local dev orchestration
├── .env.example               # Environment template
├── Makefile                   # Developer-friendly commands (make up, make test)
├── environments/              # Per-environment overrides
│   ├── dev/
│   ├── staging/
│   └── production/
├── tests/
│   └── e2e/                   # Cross-service E2E tests
├── docs/
│   ├── architecture/          # ADRs, system diagrams
│   └── runbooks/              # Operational procedures
└── scripts/                   # Utility scripts (setup, seed, health checks)
```

**Standard/Enterprise additions:**

```
├── infrastructure/            # Shared IaC (Terraform modules, network config)
├── helm/                      # Helm umbrella chart or per-service charts
│   ├── Chart.yaml             # Dependencies with pinned versions
│   └── values/
│       ├── dev.yaml
│       ├── staging.yaml
│       └── production.yaml
├── contracts/                 # API contracts (OpenAPI specs, Pact contracts)
└── ci/                        # System-level CI/CD pipelines
```

**Choose the manifest format based on tier:**
- **Lightweight**: `docker-compose.yml` with image tags pinned in `versions.yaml` or `.env`
- **Standard**: Helm charts with `values-<env>.yaml` overrides, or Kustomize with base + overlays
- **Enterprise**: Helm umbrella chart with sub-charts per service, or Kustomize with ApplicationSets

## Step 3: Define the Version Pinning Strategy

This is the core mechanism. The deployment repo acts as a **compatibility lock** — analogous to `package-lock.json` but at the system level.

**Semantic versioning is the contract.** Each app repo tags releases with semver (`v1.2.3`). The deployment repo's `versions.yaml` records which versions have been validated together:

```yaml
# versions.yaml — the compatibility lock
services:
  api-gateway:
    image: registry.example.com/api-gateway
    version: v2.3.1
  user-service:
    image: registry.example.com/user-service
    version: v1.7.0
  billing-service:
    image: registry.example.com/billing-service
    version: v3.1.2

validated:
  timestamp: "2025-01-15T14:30:00Z"
  e2e_result: pass
  contract_result: pass
```

**Version pinning rules:**

1. **Pin exact versions, not ranges** — `v1.7.0`, not `v1.x` or `latest`. The deployment repo records what was tested, not what might work.
2. **Promote version sets, not individual services** — When staging's version set passes validation, the entire set promotes to production. This prevents "it worked in staging" failures caused by version drift.
3. **Breaking changes require coordinated bumps** — If `api-gateway` v3.0.0 requires `user-service` v2.0.0, both versions update in the same deployment repo commit.
4. **Every version combination that reaches an environment is recorded** — The deployment repo's git history IS the audit trail of what ran where and when.

See [references/version-compatibility.md](references/version-compatibility.md) for semver contract details, compatibility matrices, and breaking change coordination patterns.

## Step 4: Design Contract Tests

Version pinning is only trustworthy if compatibility is actually tested. Contract tests validate that pinned versions can talk to each other.

**Consumer-driven contracts (recommended for HTTP APIs):**
- Each consumer service defines its expectations of a provider's API (a "contract")
- Contracts live in the deployment repo's `contracts/` directory or are published to a Pact Broker
- The deployment repo CI runs contract verification: for each service pair, verify that the pinned provider version satisfies the pinned consumer's contract
- The **`can-i-deploy`** check (Pact Broker) answers: "are these specific versions compatible?"

**Schema validation (recommended for event-driven systems):**
- Event schemas (Avro, Protobuf, JSON Schema) live in the deployment repo or a schema registry
- CI validates that producer schemas are backward-compatible with what consumers expect
- Schema evolution rules: additive changes are safe, field removal/rename is breaking

**What to test in the deployment repo CI:**
1. Contract compatibility between all pinned service versions
2. E2E smoke tests against the composed system (docker-compose up + test suite)
3. Database migration compatibility (if services share a database)

## Step 5: Set Up Environment Promotion

The deployment repo PR is the promotion mechanism. No version reaches any environment without going through it.

**Promotion flow:**

```
App repo tags v1.8.0
    → Automated PR to deployment repo: "bump user-service to v1.8.0 in dev"
        → CI runs contract tests + E2E in dev
            → Merge → dev deploys automatically
                → Manual PR: "promote dev version set to staging"
                    → CI runs full E2E in staging
                        → Merge → staging deploys
                            → Manual PR with approval gate: "promote to production"
                                → Merge → production deploys (canary optional)
```

**Key design decisions:**
- **Dev**: auto-promote on merge, fast feedback
- **Staging**: manual promotion trigger, full E2E validation
- **Production**: approval gate (require N reviewers), optional canary rollout
- **Rollback**: revert the deployment repo commit — the previous version set is restored

For automated cross-repo triggers (app repo build -> deployment repo PR), see `gitops-delivery`.

## Step 6: Validate and Document

Verify the full lifecycle works:

- [ ] A version bump in an app repo triggers an update in the deployment repo (manual or automated)
- [ ] Contract tests catch an intentionally incompatible version combination
- [ ] E2E tests run against the composed system in CI
- [ ] Promotion from dev to staging works via PR
- [ ] Rollback works by reverting a deployment repo commit
- [ ] A new developer can `make up` and get the full system running locally
- [ ] Adding a new service to the deployment repo is documented

**Document for the team:**
- How to add a new service to the deployment repo
- How to bump a service version (manual process or automated trigger)
- How to promote across environments
- How to rollback
- How to run E2E tests locally

## Principles Applied

- **Single source of truth**: The deployment repo is THE place to understand what's running where. Don't split this knowledge across wikis, Slack threads, and CI configs.
- **KISS**: Start lightweight (docker-compose + versions.yaml). Graduate to Helm/ArgoCD when the pain of the simple approach exceeds the cost of the complex one.
- **Explicit over implicit**: Pin exact versions. Record test results. Make the compatibility lock visible, not assumed.
- **YAGNI**: Don't set up Helm umbrella charts for 3 services. Don't add ArgoCD before you have multiple environments. Scale the tooling to the problem.
- **Promote sets, not services**: The fundamental principle — a validated version set moves together through environments.

## Cross-Skill References

- `gitops-delivery` — automate delivery from the deployment repo using ArgoCD/Flux and cross-repo triggers
- `containerization` — Helm chart structure, Kustomize overlays, and Dockerfile patterns for services
- `infrastructure-as-code` — Terraform modules for shared infrastructure in the deployment repo
- `cicd-pipeline` — system-level CI pipelines and cross-repo pipeline design
- `dependency-impact-analysis` — map blast radius of breaking changes across services before updating version pins
- `rollback-strategy` — rollback in a deployment repo context is a git revert of the version set
- `architecture-design` — ADR for adopting the deployment repo pattern itself
