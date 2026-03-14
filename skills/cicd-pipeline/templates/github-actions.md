# CI/CD Pipeline Templates

---

## GitHub Actions — PR Validation

`.github/workflows/ci.yml`

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

# Cancel in-progress runs on new push to the same PR/branch
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  validate:
    name: Lint, Test, Build
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"            # Caches node_modules between runs

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npm run typecheck

      - name: Unit tests
        run: npm test -- --coverage

      - name: Build
        run: npm run build

      # Upload coverage to your coverage service (Codecov, Coveralls, etc.)
      # - uses: codecov/codecov-action@v4
```

---

## GitHub Actions — Production Deploy

`.github/workflows/deploy.yml`

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

concurrency:
  group: deploy-production
  cancel-in-progress: false     # Never cancel a deploy in progress

jobs:
  test:
    name: Tests
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - run: npm test

  build:
    name: Build & Push Image
    needs: test
    runs-on: ubuntu-latest
    timeout-minutes: 20
    outputs:
      image-tag: ${{ steps.meta.outputs.tags }}
    steps:
      - uses: actions/checkout@v4

      - name: Docker metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository }}
          tags: |
            type=sha,prefix=sha-

      - name: Log in to registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    name: Deploy
    needs: build
    runs-on: ubuntu-latest
    timeout-minutes: 20
    environment: production       # Requires manual approval gate in GitHub environment settings
    steps:
      - name: Deploy
        env:
          IMAGE_TAG: ${{ needs.build.outputs.image-tag }}
          DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
        run: |
          # Replace with your deploy command: kubectl, fly deploy, aws ecs update-service, etc.
          echo "Deploying $IMAGE_TAG"

      - name: Smoke test
        run: |
          # Verify the deployment is healthy before declaring success
          curl --fail --retry 5 --retry-delay 5 https://your-app.example.com/health
```

---

## GitLab CI Equivalent

`.gitlab-ci.yml`

```yaml
stages:
  - test
  - build
  - deploy

variables:
  IMAGE_TAG: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA

# Cache dependencies across jobs in the same pipeline
cache:
  key:
    files:
      - package-lock.json
  paths:
    - node_modules/

test:
  stage: test
  image: node:20-alpine
  script:
    - npm ci
    - npm run lint
    - npm test
  coverage: '/Lines\s*:\s*(\d+\.?\d*)%/'  # Regex to parse coverage from test output

build:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker build -t $IMAGE_TAG .
    - docker push $IMAGE_TAG
  only:
    - main

deploy_production:
  stage: deploy
  environment:
    name: production
    url: https://your-app.example.com
  script:
    - echo "Deploy $IMAGE_TAG to production"
    # kubectl set image deployment/app app=$IMAGE_TAG
  when: manual                  # Require manual trigger for production
  only:
    - main
```

---

> **Key practices baked into these templates:**
> - `concurrency` cancels stale CI runs but never cancels in-progress deploys
> - Secrets are scoped to jobs that need them via GitHub environments
> - Actions pinned to `@v4` tags (replace with SHA pins for stronger supply-chain security)
> - `cache: "npm"` / GitLab `cache` reduces install time by 60–80% after first run
> - Smoke test after deploy catches broken deployments before users do
