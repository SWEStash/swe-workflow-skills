# GitOps Configuration Templates

Ready-to-use templates. Replace placeholders (`<org>`, `<service>`, `<env>`) with your values.

## ArgoCD Application Template

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: <service>-<env>
  namespace: argocd
  labels:
    environment: <env>
    service: <service>
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: <project-name>
  source:
    repoURL: https://github.com/<org>/deployment-repo
    targetRevision: main
    path: helm/<service>
    helm:
      valueFiles:
        - ../../environments/<env>/<service>-values.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: <env>
  syncPolicy:
    # For staging: uncomment automated block
    # For production: leave syncPolicy empty (manual sync)
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
    retry:
      limit: 3
      backoff:
        duration: 5s
        factor: 2
```

## Flux Kustomization Template

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: deployment-repo
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/<org>/deployment-repo
  ref:
    branch: main
  secretRef:
    name: deployment-repo-auth
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: <env>-apps
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: deployment-repo
  path: ./overlays/<env>
  prune: true
  wait: true
  timeout: 5m
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: <service>
      namespace: <env>
```

## Cross-Repo Trigger Workflow (GitHub Actions)

### App repo side (add to your release workflow)

```yaml
# Add this step after building and pushing the Docker image
- name: Mint a short-lived token for the deployment repo   # a GitHub App installed on the deployment repo; no long-lived PAT
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
    repository: <org>/deployment-repo
    event-type: version-bump
    client-payload: >
      {
        "service": "<service>",
        "version": "${{ github.ref_name }}",
        "image": "ghcr.io/<org>/<service>:${{ github.ref_name }}",
        "commit_sha": "${{ github.sha }}"
      }
```

### Deployment repo side (version-bump receiver)

```yaml
name: Version Bump
on:
  repository_dispatch:
    types: [version-bump]

jobs:
  create-bump-pr:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Update versions
        run: |
          SERVICE="${{ github.event.client_payload.service }}"
          VERSION="${{ github.event.client_payload.version }}"
          yq e ".services.${SERVICE}.version = \"${VERSION}\"" \
            -i environments/dev/versions.yaml

      - name: Create PR
        uses: peter-evans/create-pull-request@v6
        with:
          title: "bump ${{ github.event.client_payload.service }} to ${{ github.event.client_payload.version }}"
          branch: "bump/${{ github.event.client_payload.service }}-${{ github.event.client_payload.version }}"
          labels: version-bump,automated
          body: |
            Automated version bump from app repo CI.

            **Service:** ${{ github.event.client_payload.service }}
            **Version:** ${{ github.event.client_payload.version }}
```

## Renovate Config (Automated Image Tag Updates)

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["config:base"],
  "kubernetes": {
    "fileMatch": ["environments/.+\\.yaml$"]
  },
  "packageRules": [
    {
      "matchDatasources": ["docker"],
      "matchPackagePatterns": ["ghcr.io/<org>/*"],
      "groupName": "service-images",
      "automerge": false,
      "labels": ["version-bump", "automated"],
      "schedule": ["every weekday"]
    }
  ]
}
```

## Environment Promotion Workflow

```yaml
name: Promote to Staging
on:
  workflow_dispatch:
    inputs:
      source_env:
        description: "Source environment"
        default: "dev"
      target_env:
        description: "Target environment"
        default: "staging"

jobs:
  promote:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Copy version set
        run: |
          cp environments/${{ inputs.source_env }}/versions.yaml \
             environments/${{ inputs.target_env }}/versions.yaml

      - name: Create promotion PR
        uses: peter-evans/create-pull-request@v6
        with:
          title: "promote: ${{ inputs.source_env }} -> ${{ inputs.target_env }}"
          branch: "promote/${{ inputs.source_env }}-to-${{ inputs.target_env }}"
          labels: promotion
          body: |
            Promoting version set from **${{ inputs.source_env }}** to **${{ inputs.target_env }}**.

            ```
            $(diff environments/${{ inputs.source_env }}/versions.yaml environments/${{ inputs.target_env }}/versions.yaml || true)
            ```
```
