# Pipeline Patterns

## Contents
- GitHub Actions patterns
- GitLab CI patterns
- General anti-patterns

## GitHub Actions: Full PR + Deploy Pipeline

```yaml
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true  # Cancel outdated runs on same branch

jobs:
  lint:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: testdb
        ports: ['5432:5432']
        options: >-
          --health-cmd="pg_isready -U test"
          --health-interval=5s
          --health-timeout=3s
          --health-retries=5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm test
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage-report
          path: coverage/

  build:
    needs: [lint, test]
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ github.token }}
      - uses: docker/build-push-action@v5
        with:
          push: ${{ github.event_name == 'push' && github.ref == 'refs/heads/main' }}
          tags: ghcr.io/${{ github.repository }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-staging:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    needs: [build]
    runs-on: ubuntu-latest
    environment: staging
    timeout-minutes: 10
    steps:
      - name: Deploy to staging
        run: echo "Deploy image ghcr.io/${{ github.repository }}:${{ github.sha }}"
      - name: Smoke test
        run: |
          sleep 10
          curl --fail "${{ vars.STAGING_URL }}/health"

  deploy-production:
    needs: [deploy-staging]
    runs-on: ubuntu-latest
    environment:
      name: production
      url: ${{ vars.PRODUCTION_URL }}
    timeout-minutes: 10
    steps:
      - name: Deploy to production
        run: echo "Deploy image ghcr.io/${{ github.repository }}:${{ github.sha }}"
      - name: Smoke test
        run: curl --fail "${{ vars.PRODUCTION_URL }}/health"
```

## GitLab CI: Full Pipeline

```yaml
stages:
  - validate
  - test
  - build
  - deploy

variables:
  NODE_VERSION: "20"

default:
  cache:
    key: ${CI_COMMIT_REF_SLUG}
    paths:
      - node_modules/

lint:
  stage: validate
  image: node:${NODE_VERSION}-alpine
  script:
    - npm ci --cache .npm
    - npm run lint
  timeout: 5 minutes

test:
  stage: test
  image: node:${NODE_VERSION}-alpine
  services:
    - postgres:16-alpine
  variables:
    POSTGRES_USER: test
    POSTGRES_PASSWORD: test
    POSTGRES_DB: testdb
    DATABASE_URL: postgresql://test:test@postgres:5432/testdb
  script:
    - npm ci --cache .npm
    - npm test
  coverage: '/Statements\s*:\s*(\d+\.?\d*)%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

build:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
  only:
    - main

deploy-staging:
  stage: deploy
  environment:
    name: staging
    url: $STAGING_URL
  script:
    - echo "Deploy $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA to staging"
  only:
    - main

deploy-production:
  stage: deploy
  environment:
    name: production
    url: $PRODUCTION_URL
  script:
    - echo "Deploy $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA to production"
  when: manual  # Require manual approval
  only:
    - main
```

## General Anti-patterns

**No caching**: Installing dependencies from scratch on every run wastes 2-5 minutes. Always cache package manager artifacts.

**Testing in production only**: If the pipeline only deploys, bugs reach users. Every pipeline needs at minimum: lint + test + build before deploy.

**Long-running monolith pipeline**: A 45-minute pipeline that runs everything sequentially kills developer productivity. Parallelize independent jobs. Target: green in under 10 minutes for PR checks.

**Secrets in pipeline logs**: Use masking. Never echo a secret or pass it as a command-line argument (visible in process lists). Use environment variables and ensure the CI platform masks them.

**No concurrency control**: Without concurrency groups, pushing twice quickly queues two full pipeline runs. Cancel outdated runs on the same branch.

**Deploy without smoke test**: A successful deploy step doesn't mean the app works. Always follow deploys with an automated health check.
