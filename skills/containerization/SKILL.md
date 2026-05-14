---
name: containerization
description: "Write production-grade Dockerfiles, docker-compose, and Kubernetes manifests following security and reliability best practices. Triggers: Dockerfile, docker-compose, containerize, Docker image, Kubernetes, k8s manifest, container, pod, deployment yaml, multi-stage build, docker build, image size, container security."
model: sonnet
allowed-tools: Read, Grep, Glob, Write, Edit, Bash
---

# Containerization

Write production-quality container configurations — Dockerfiles, compose files, and Kubernetes manifests — that are secure, efficient, and reproducible.

## Workflow: Dockerfile

### Step 1: Understand the Application

Before writing a Dockerfile, establish:

- **Runtime**: Node.js, Python, Go, Java, etc. and specific version
- **Build process**: Does it need compilation, asset bundling, dependency installation?
- **Runtime dependencies**: System packages, native libraries
- **Entry point**: What command starts the application?
- **Configuration**: Environment variables, config files, secrets

### Step 2: Write the Dockerfile

Follow these principles in order of importance:

**1. Use multi-stage builds** — Separate build dependencies from the runtime image. Build artifacts in one stage, copy only what's needed to a slim final stage.

**2. Pin base image versions** — Never use `latest`. Use specific digests or version tags: `node:20.11-alpine3.19`, not `node:latest`.

**3. Minimize layers and image size** — Combine related RUN commands with `&&`. Use Alpine or distroless base images. Remove package manager caches after install.

**4. Order for cache efficiency** — Place infrequently changing instructions (system deps) before frequently changing ones (application code). Copy dependency manifests before source code.

**5. Run as non-root** — Create a dedicated user and switch to it. Never run production containers as root.

**6. Use .dockerignore** — Exclude node_modules, .git, .env, test files, docs from the build context.

Use [templates/dockerfile.md](templates/dockerfile.md) as a starting point for Node.js, Python, Go, and docker-compose configurations.

### Step 3: Validate

- [ ] Image builds successfully
- [ ] Image size is reasonable for the application type
- [ ] Container runs as non-root user
- [ ] No secrets baked into the image (check with `docker history`)
- [ ] Health check is defined
- [ ] .dockerignore excludes unnecessary files

## Workflow: Docker Compose (Local Development)

Design compose files that give developers a one-command local environment:

- All services defined (app, database, cache, queue)
- Volumes for hot-reload development
- Named volumes for data persistence across restarts
- Environment variables with sensible defaults via `.env.example`
- Health checks and dependency ordering (`depends_on` with `condition: service_healthy`)
- Port mappings that avoid common conflicts

See [references/dockerfile-patterns.md](references/dockerfile-patterns.md) for compose patterns.

## Workflow: Kubernetes Manifests

When creating K8s deployments:

1. **Define resource requests and limits** — Always. Without them, a single pod can starve the cluster.
2. **Configure health probes** — Liveness (is the process alive?), readiness (can it serve traffic?), startup (for slow-starting apps).
3. **Use ConfigMaps and Secrets** — Never hardcode configuration in manifests.
4. **Set pod disruption budgets** — For availability during upgrades.
5. **Use namespaces** — Isolate environments (dev, staging, prod) and teams.
6. **Define HPA** — Horizontal pod autoscaling based on CPU/memory or custom metrics.

## When to Use Helm or Kustomize

For multi-environment deployments or when using a deployment repo pattern, plain manifests become hard to manage. Choose based on your needs:

- **Plain manifests**: Single environment, few resources, no templating needed. Start here.
- **Kustomize**: Multiple environments with small differences (replicas, resource limits, image tags). Uses patches over a base — no templating language to learn.
- **Helm**: Complex deployments with many configurable parameters, or when you need to package charts for reuse. More powerful but more complexity.

See `deployment-repo` for organizing Helm charts and Kustomize overlays in a deployment repo, and `gitops-delivery` for using them with ArgoCD or Flux.

## Principles Applied

- **KISS**: Start with the simplest configuration that works. Single-stage Docker build before multi-stage. Docker Compose before Kubernetes.
- **DRY**: Use build args and env vars to parameterize, not duplicate Dockerfiles per environment.
- **Security by default**: Non-root, minimal image, no secrets in layers, read-only filesystem where possible.
- **YAGNI**: Don't add Kubernetes if Docker Compose serves your scale. Don't add Helm charts if plain manifests suffice.
