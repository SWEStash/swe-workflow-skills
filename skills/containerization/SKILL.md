---
name: containerization
description: Write production-grade Dockerfiles, docker-compose configurations, and Kubernetes manifests following security, performance, and reliability best practices. Use when the user needs to containerize an application, write a Dockerfile, create docker-compose for local development, design Kubernetes deployments, optimize container images, or troubleshoot container issues. Triggers on phrases like "Dockerfile", "docker-compose", "containerize", "Docker image", "Kubernetes", "k8s manifest", "container", "pod", "deployment yaml", "multi-stage build", "docker build", or when deployment-checklist involves container-based infrastructure.
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

## Principles Applied

- **KISS**: Start with the simplest configuration that works. Single-stage Docker build before multi-stage. Docker Compose before Kubernetes.
- **DRY**: Use build args and env vars to parameterize, not duplicate Dockerfiles per environment.
- **Security by default**: Non-root, minimal image, no secrets in layers, read-only filesystem where possible.
- **YAGNI**: Don't add Kubernetes if Docker Compose serves your scale. Don't add Helm charts if plain manifests suffice.
