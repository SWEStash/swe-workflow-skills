# Dockerfile Templates

Copy the appropriate template, then replace placeholder values (`APP_NAME`, port numbers, etc.).

---

## Node.js — Multi-Stage

```dockerfile
# syntax=docker/dockerfile:1
FROM node:20.11-alpine3.19 AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:20.11-alpine3.19 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20.11-alpine3.19 AS production
WORKDIR /app
ENV NODE_ENV=production
# Non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=deps --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=build --chown=appuser:appgroup /app/dist ./dist
USER appuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/index.js"]
```

---

## Python — Multi-Stage

```dockerfile
# syntax=docker/dockerfile:1
FROM python:3.12-slim AS build
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM python:3.12-slim AS production
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
COPY --from=build --chown=appuser:appgroup /install /usr/local
COPY --chown=appuser:appgroup . .
USER appuser
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"
CMD ["python", "-m", "gunicorn", "app.main:app", "--bind", "0.0.0.0:8000"]
```

---

## Go — Binary (Minimal Runtime)

```dockerfile
# syntax=docker/dockerfile:1
FROM golang:1.22-alpine AS build
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/server ./cmd/server

FROM gcr.io/distroless/static-debian12 AS production
WORKDIR /app
# distroless runs as nonroot (uid 65532) by default
COPY --from=build /app/server .
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD ["/app/server", "healthcheck"]
ENTRYPOINT ["/app/server"]
```

---

## .dockerignore

```
.git
.gitignore
*.md
.env*
node_modules/
dist/
build/
coverage/
**/*.test.*
**/*.spec.*
Dockerfile*
docker-compose*
```

---

## docker-compose.yml — Local Development

```yaml
services:
  app:
    build:
      context: .
      target: build          # Use build stage for hot-reload; swap to production for prod-parity testing
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgres://app:secret@db:5432/appdb
      - REDIS_URL=redis://cache:6379
    volumes:
      - .:/app               # Hot-reload mount
      - /app/node_modules    # Prevent host node_modules overwrite
    depends_on:
      db:
        condition: service_healthy
      cache:
        condition: service_started

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: appdb
      POSTGRES_USER: app
      POSTGRES_PASSWORD: secret
    volumes:
      - db-data:/var/lib/postgresql/data
    ports:
      - "5432:5432"          # Remove in production
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d appdb"]
      interval: 10s
      timeout: 5s
      retries: 5

  cache:
    image: redis:7-alpine
    volumes:
      - cache-data:/data

volumes:
  db-data:
  cache-data:
```

> **Key rules:** Never put real secrets in docker-compose.yml. Use a `.env` file (git-ignored) or a secrets manager. The `.env.example` file documents required variables without values.
