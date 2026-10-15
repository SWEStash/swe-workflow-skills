# GitOps Patterns Reference

## ArgoCD Patterns

### Application Resource (Complete Example)

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: user-service-staging
  namespace: argocd
  labels:
    app.kubernetes.io/part-of: platform
    environment: staging
  # Finalizer ensures resources are cleaned up when Application is deleted
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: platform          # ArgoCD project for RBAC scoping

  source:
    repoURL: https://github.com/org/deployment-repo
    targetRevision: main
    path: helm/user-service
    helm:
      valueFiles:
        - ../../environments/staging/user-service-values.yaml
      # Override specific values inline
      parameters:
        - name: image.tag
          value: "v1.7.0"

  destination:
    server: https://kubernetes.default.svc
    namespace: staging

  syncPolicy:
    automated:
      prune: true             # Delete resources removed from Git
      selfHeal: true          # Revert manual cluster changes
      allowEmpty: false       # Don't sync if source is empty (safety)
    syncOptions:
      - CreateNamespace=true
      - PrunePropagationPolicy=foreground
      - PruneLast=true        # Prune after other syncs complete
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m

  # Health checks beyond default K8s readiness
  ignoreDifferences:
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas    # Ignore HPA-managed replicas
```

### App of Apps Pattern

The "App of Apps" pattern uses one root Application that manages all other Applications:

```yaml
# argocd/root.yaml — the root Application
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: platform-staging
  namespace: argocd
spec:
  project: platform
  source:
    repoURL: https://github.com/org/deployment-repo
    targetRevision: main
    path: argocd/staging       # Contains Application YAMLs for all services
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

Benefits:
- Add a new service by adding an Application YAML to the directory
- All Applications are version-controlled and managed declaratively
- Single point of entry for the platform

### ApplicationSet (Dynamic Application Generation)

For enterprise setups with many services and environments:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: platform-services
  namespace: argocd
spec:
  generators:
    - matrix:
        generators:
          - git:
              repoURL: https://github.com/org/deployment-repo
              revision: main
              directories:
                - path: helm/*        # Each subdirectory = a service
          - list:
              elements:
                - environment: staging
                  cluster: https://staging.k8s.local
                  autoSync: "true"
                - environment: production
                  cluster: https://prod.k8s.local
                  autoSync: "false"
  template:
    metadata:
      name: "{{path.basename}}-{{environment}}"
    spec:
      project: platform
      source:
        repoURL: https://github.com/org/deployment-repo
        targetRevision: main
        path: "{{path}}"
        helm:
          valueFiles:
            - "../../environments/{{environment}}/{{path.basename}}-values.yaml"
      destination:
        server: "{{cluster}}"
        namespace: "{{environment}}"
      syncPolicy:
        automated:
          prune: "{{autoSync}}"
          selfHeal: "{{autoSync}}"
```

### Sync Waves (Deployment Ordering)

Control the order resources are applied:

```yaml
# Wave 0: Namespace and config (applied first)
apiVersion: v1
kind: Namespace
metadata:
  name: staging
  annotations:
    argocd.argoproj.io/sync-wave: "0"
---
# Wave 1: Database migration job
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migrate
  annotations:
    argocd.argoproj.io/sync-wave: "1"
    argocd.argoproj.io/hook: PreSync       # Run before main sync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
---
# Wave 2: Backend services
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
  annotations:
    argocd.argoproj.io/sync-wave: "2"
---
# Wave 3: Frontend (depends on backend)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  annotations:
    argocd.argoproj.io/sync-wave: "3"
---
# Wave 4: Ingress (after services are healthy)
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: platform-ingress
  annotations:
    argocd.argoproj.io/sync-wave: "4"
```

### RBAC Configuration

```yaml
# ArgoCD project for team isolation
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: platform
  namespace: argocd
spec:
  description: Platform services
  sourceRepos:
    - https://github.com/org/deployment-repo
  destinations:
    - namespace: staging
      server: https://kubernetes.default.svc
    - namespace: production
      server: https://kubernetes.default.svc
  # Restrict what can be deployed
  clusterResourceWhitelist:
    - group: ""
      kind: Namespace
  namespaceResourceWhitelist:
    - group: "apps"
      kind: Deployment
    - group: ""
      kind: Service
    - group: "networking.k8s.io"
      kind: Ingress
  # Roles
  roles:
    - name: deployer
      description: Can sync applications
      policies:
        - p, proj:platform:deployer, applications, sync, platform/*, allow
        - p, proj:platform:deployer, applications, get, platform/*, allow
      groups:
        - platform-team
```

### Sync Windows (Maintenance Windows)

```yaml
# In the AppProject spec
spec:
  syncWindows:
    - kind: allow
      schedule: "0 8-18 * * 1-5"    # Allow sync Mon-Fri 8am-6pm
      duration: 10h
      applications:
        - "*-production"
    - kind: deny
      schedule: "0 0 * * 0"          # Deny sync on Sundays
      duration: 24h
      applications:
        - "*-production"
```

## Flux Patterns

### GitRepository Source

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: deployment-repo
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/org/deployment-repo
  ref:
    branch: main
  secretRef:
    name: deployment-repo-auth
```

### Kustomization (Flux)

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: staging-infrastructure
  namespace: flux-system
spec:
  interval: 10m
  retryInterval: 1m
  timeout: 5m
  sourceRef:
    kind: GitRepository
    name: deployment-repo
  path: ./infrastructure/staging
  prune: true
  wait: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: user-service
      namespace: staging
  # Dependencies: infra must be ready before apps
  dependsOn:
    - name: staging-namespaces
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: staging-apps
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: deployment-repo
  path: ./overlays/staging
  prune: true
  dependsOn:
    - name: staging-infrastructure
```

### Image Automation (Flux)

Flux can automatically detect new image tags and update the deployment repo:

```yaml
# Watch the registry for new tags
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: user-service
  namespace: flux-system
spec:
  image: ghcr.io/org/user-service
  interval: 5m
---
# Policy: use latest semver tag
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: user-service
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: user-service
  policy:
    semver:
      range: ">=1.0.0"
---
# Auto-update: commit new tags back to the deployment repo
apiVersion: image.toolkit.fluxcd.io/v1beta1
kind: ImageUpdateAutomation
metadata:
  name: deployment-repo-update
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: deployment-repo
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: flux-bot
        email: flux@org.com
      messageTemplate: "bump {{ range .Updated.Images }}{{ .}} {{ end }}"
    push:
      branch: main
  update:
    path: ./environments/dev
    strategy: Setters
```

## Cross-Repo Trigger Patterns

### GitHub Actions: Complete Trigger Flow

**App repo (sender):**

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    tags: ['v*']

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          push: true
          tags: ghcr.io/org/user-service:${{ github.ref_name }}

      - name: Mint a short-lived token for the deployment repo
        id: app-token
        uses: actions/create-github-app-token@v1
        with:
          app-id: ${{ vars.DEPLOY_APP_ID }}
          private-key: ${{ secrets.DEPLOY_APP_PRIVATE_KEY }}
          repositories: deployment-repo
      - name: Trigger deployment repo update
        uses: peter-evans/repository-dispatch@v3
        with:
          token: ${{ steps.app-token.outputs.token }}
          repository: org/deployment-repo
          event-type: version-bump
          client-payload: >
            {
              "service": "user-service",
              "version": "${{ github.ref_name }}",
              "image": "ghcr.io/org/user-service:${{ github.ref_name }}",
              "commit_sha": "${{ github.sha }}",
              "commit_message": "${{ github.event.head_commit.message }}"
            }
```

**Deployment repo (receiver):**

```yaml
# .github/workflows/version-bump.yml
name: Version Bump
on:
  repository_dispatch:
    types: [version-bump]

jobs:
  create-bump-pr:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Update versions.yaml
        run: |
          SERVICE="${{ github.event.client_payload.service }}"
          VERSION="${{ github.event.client_payload.version }}"
          yq e ".services.${SERVICE}.version = \"${VERSION}\"" -i environments/dev/versions.yaml

      - name: Create Pull Request
        uses: peter-evans/create-pull-request@v6
        with:
          title: "bump ${{ github.event.client_payload.service }} to ${{ github.event.client_payload.version }}"
          body: |
            Automated version bump triggered by [${{ github.event.client_payload.service }}](https://github.com/org/${{ github.event.client_payload.service }}/commit/${{ github.event.client_payload.commit_sha }}).

            **Service:** ${{ github.event.client_payload.service }}
            **Version:** ${{ github.event.client_payload.version }}
            **Commit:** ${{ github.event.client_payload.commit_message }}
          branch: "bump/${{ github.event.client_payload.service }}-${{ github.event.client_payload.version }}"
          labels: version-bump,automated
```

## Drift Detection and Remediation

### ArgoCD drift behavior

- **selfHeal: true** — ArgoCD reverts any manual cluster change within the sync interval (default 3 minutes)
- **selfHeal: false** — ArgoCD detects drift and shows it in the UI but doesn't auto-fix
- **Notifications on drift**: Configure ArgoCD Notifications to alert on `OutOfSync` status

```yaml
# ArgoCD Notification trigger
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  annotations:
    notifications.argoproj.io/subscribe.on-sync-status-unknown.slack: platform-alerts
    notifications.argoproj.io/subscribe.on-health-degraded.slack: platform-alerts
```

### Flux drift behavior

- **prune: true** — Flux removes resources that exist in the cluster but not in Git
- **force: true** — Flux recreates resources that can't be patched (use carefully)
- **Alerts**: Flux native alert provider

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: drift-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: "*"
```
