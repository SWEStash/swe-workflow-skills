---
name: gitops-delivery
description: "Design GitOps continuous delivery with ArgoCD or Flux — declarative reconciliation, cross-repo CI/CD triggers, drift detection, progressive delivery. Triggers: ArgoCD, Flux, FluxCD, GitOps, git-based deployment, declarative delivery, auto-sync, drift detection, cross-repo trigger, reconciliation loop, pull-based deployment, canary GitOps."
allowed-tools: Read, Grep, Glob, Write, Edit, Bash
---

# GitOps Delivery

GitOps makes Git the single source of truth for deployment state. An operator watches a Git repository and continuously reconciles the cluster to match what's declared in Git. The deployment repo defines the desired state — the GitOps operator enforces it.

## Step 1: Choose the GitOps Model

**Pull-based (recommended):** An operator running in the cluster watches the deployment repo and applies changes. No CI system needs cluster credentials.
- **ArgoCD**: Application-centric, strong UI, sync waves for ordering, multi-cluster support
- **Flux**: Toolkit-based, composable, native Kustomize/Helm support, image automation

**Push-based (simpler but less robust):** CI pipeline runs `kubectl apply` or `helm upgrade` after building. Simpler to set up but has drawbacks: CI needs cluster credentials, no drift detection, no self-healing.

**Decision guide:**

| Factor | Push-based | Pull-based (GitOps) |
|--------|-----------|-------------------|
| **Setup complexity** | Lower | Higher initial setup |
| **Cluster credentials** | CI needs them | Only operator needs them |
| **Drift detection** | None | Automatic |
| **Self-healing** | None | Operator reverts manual changes |
| **Audit trail** | CI logs | Git history (stronger) |
| **Multi-cluster** | Duplicated CI jobs | Native support |

**When push-based is fine:** Single cluster, single environment, small team, no compliance requirements. See `cicd-pipeline` for push-based patterns.

**When GitOps is worth it:** Multiple environments, compliance/audit needs, multi-cluster, or you want drift detection and self-healing.

## Step 2: Design Cross-Repo Triggers

The critical bridge: when an app repo builds a new image, the deployment repo must be updated. This is the most common source of friction in GitOps setups.

**Pattern A: Automated PR via GitHub Actions `repository_dispatch`**

App repo CI triggers a workflow in the deployment repo:

```yaml
# In app repo: .github/workflows/release.yml
- name: Trigger deployment repo update
  uses: peter-evans/repository-dispatch@v3
  with:
    token: ${{ secrets.DEPLOY_REPO_TOKEN }}
    repository: org/deployment-repo
    event-type: version-bump
    client-payload: |
      {
        "service": "user-service",
        "version": "v1.8.0",
        "image": "ghcr.io/org/user-service:v1.8.0"
      }
```

```yaml
# In deployment repo: .github/workflows/version-bump.yml
on:
  repository_dispatch:
    types: [version-bump]

jobs:
  update-version:
    steps:
      - uses: actions/checkout@v4
      - name: Update versions.yaml
        run: |
          yq e ".services.${{ github.event.client_payload.service }}.version = \"${{ github.event.client_payload.version }}\"" \
            -i environments/dev/versions.yaml
      - name: Create PR
        uses: peter-evans/create-pull-request@v6
        with:
          title: "bump ${{ github.event.client_payload.service }} to ${{ github.event.client_payload.version }}"
          branch: "bump/${{ github.event.client_payload.service }}-${{ github.event.client_payload.version }}"
```

**Pattern B: Renovate / Dependabot for image tags**

Configure Renovate to watch container registries and create PRs when new tags appear:

```json
{
  "packageRules": [
    {
      "matchDatasources": ["docker"],
      "matchPackagePatterns": ["ghcr.io/org/*"],
      "automerge": false,
      "labels": ["version-bump"]
    }
  ]
}
```

**Pattern C: GitLab CI downstream pipeline**

```yaml
# In app repo: .gitlab-ci.yml
trigger-deployment:
  stage: deploy
  trigger:
    project: org/deployment-repo
    branch: main
    strategy: depend
  variables:
    SERVICE_NAME: user-service
    SERVICE_VERSION: $CI_COMMIT_TAG
```

**Recommendation:** Pattern A (repository_dispatch + PR) for most teams. It creates an auditable PR, allows contract tests to run before merge, and doesn't require additional tooling. Use Pattern B (Renovate) if you want fully automated version tracking without custom workflows.

## Step 3: Configure the GitOps Operator

### ArgoCD Setup

**Application per service per environment:**

```yaml
# argocd/staging/user-service.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: user-service-staging
  namespace: argocd
  labels:
    environment: staging
    service: user-service
spec:
  project: default
  source:
    repoURL: https://github.com/org/deployment-repo
    targetRevision: main
    path: helm/user-service
    helm:
      valueFiles:
        - ../../environments/staging/user-service-values.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: staging
  syncPolicy:
    automated:              # Auto-sync for staging
      prune: true           # Remove resources not in Git
      selfHeal: true        # Revert manual changes
    syncOptions:
      - CreateNamespace=true
    retry:
      limit: 3
      backoff:
        duration: 5s
        factor: 2
```

**Production — manual sync with approval:**

```yaml
# argocd/production/user-service.yaml
spec:
  syncPolicy: {}            # No automated sync — requires manual sync or CI trigger
  # Add sync windows to restrict when syncs can happen:
  syncPolicy:
    syncOptions:
      - CreateNamespace=true
    # Sync windows defined in the ArgoCD project
```

**App of Apps pattern (manage all Applications as a single unit):**

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: platform-staging
spec:
  source:
    repoURL: https://github.com/org/deployment-repo
    path: argocd/staging       # Directory containing all Application YAMLs
  destination:
    server: https://kubernetes.default.svc
```

**Sync waves (control deployment order):**

```yaml
# Database migration job runs first (wave 0), then services (wave 1), then ingress (wave 2)
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "0"   # Lower runs first
```

### Flux Setup

```yaml
# flux/staging/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: staging-apps
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: deployment-repo
  path: ./overlays/staging
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: user-service
      namespace: staging
  timeout: 3m
```

**Flux image automation (auto-update image tags):**

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: user-service
spec:
  imageRepositoryRef:
    name: user-service
  policy:
    semver:
      range: ">=1.0.0"
```

See [references/gitops-patterns.md](references/gitops-patterns.md) for complete manifests and [templates/gitops-config.md](templates/gitops-config.md) for ready-to-use templates.

## Step 4: Implement Progressive Delivery

Layer progressive delivery on top of GitOps for safer production rollouts. This step is optional for lightweight setups but critical at scale.

**Argo Rollouts (works with ArgoCD):**

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: user-service
spec:
  strategy:
    canary:
      steps:
        - setWeight: 10       # Send 10% of traffic to new version
        - pause: { duration: 5m }
        - analysis:
            templates:
              - templateName: success-rate
        - setWeight: 50
        - pause: { duration: 10m }
        - analysis:
            templates:
              - templateName: success-rate
      # Auto-rollback if analysis fails
```

**Analysis template (gate on metrics):**

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate
spec:
  metrics:
    - name: success-rate
      interval: 1m
      successCondition: result[0] >= 0.99
      provider:
        prometheus:
          address: http://prometheus:9090
          query: |
            sum(rate(http_requests_total{service="user-service",status=~"2.."}[5m]))
            /
            sum(rate(http_requests_total{service="user-service"}[5m]))
```

**Flagger (works with Flux):** Similar concept — canary analysis using Prometheus, Datadog, or other metrics providers. Flagger automatically manages the canary/primary services and traffic splitting.

**When to skip progressive delivery:** Dev and staging environments (just deploy directly). Small teams with low traffic. Services with comprehensive E2E tests that catch issues before deploy.

## Step 5: Validate End-to-End

Test the full GitOps pipeline:

- [ ] **Trigger flow**: Merge a change in an app repo -> verify a PR appears in the deployment repo
- [ ] **Contract validation**: The deployment repo PR CI runs contract tests against the new version combination
- [ ] **GitOps sync**: After merging the deployment repo PR, the operator detects the change and syncs
- [ ] **Health checks**: The operator reports healthy status after sync
- [ ] **Drift detection**: Manually modify a resource in the cluster -> verify the operator reverts it
- [ ] **Rollback**: Revert a commit in the deployment repo -> verify the operator rolls back the cluster
- [ ] **Sync windows** (if configured): Verify syncs are blocked outside allowed windows
- [ ] **Progressive delivery** (if configured): Verify canary analysis runs and gates promotion

**Monitoring the GitOps pipeline:**
- ArgoCD: Built-in UI shows sync status, health, and history per Application
- Flux: `flux get kustomizations` shows reconciliation status
- Both: Export metrics to Prometheus for alerting on sync failures

## Principles Applied

- **Git is the source of truth**: If it's not in Git, it doesn't exist. No `kubectl edit` in production, no manual Helm upgrades.
- **Pull over push**: The cluster pulls desired state from Git rather than CI pushing to the cluster. This inverts the security model — the cluster needs Git read access, not the other way around.
- **KISS**: Start with a single ArgoCD Application per environment. Add App of Apps, sync waves, and progressive delivery as complexity demands.
- **YAGNI**: Don't set up Argo Rollouts for a service with 10 requests per minute. Don't configure multi-cluster GitOps for a single cluster.
- **Declarative over imperative**: Define the desired state, let the operator figure out how to get there. Avoid custom sync scripts.

## Cross-Skill References

- `deployment-repo` — the Git repository that the GitOps operator watches; design the repo structure first
- `cicd-pipeline` — cross-repo trigger pipelines that update the deployment repo on new builds
- `rollback-strategy` — in GitOps, rollback = revert a Git commit; the operator handles the rest
- `observability-design` — metrics and dashboards for monitoring sync status, drift, and progressive delivery analysis
- `containerization` — Helm chart structure and Kustomize overlay patterns used by the operator
- `infrastructure-as-code` — Terraform for cluster and infrastructure provisioning (separate from app deployment)
