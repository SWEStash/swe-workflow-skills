# Configuration Patterns

## Feature Flag Patterns

### Boolean flags (on/off)
Simplest form. Use for new features, kill switches, and emergency toggles.

```python
if feature_flags.is_enabled("new_checkout_flow"):
    return new_checkout()
return legacy_checkout()
```

**Cleanup discipline**: Set a removal date when creating the flag. Flags that are "on everywhere" for 6+ months are dead code. Schedule a cleanup sprint quarterly.

### Percentage rollout flags
For gradual rollouts. Route by user ID (not random) to ensure consistent experience per user.

```python
def should_show_feature(user_id: int, flag_name: str, percentage: int) -> bool:
    # Consistent hash ensures same user always gets same result
    bucket = hash(f"{flag_name}:{user_id}") % 100
    return bucket < percentage
```

### Targeting flags
Enable for specific users, accounts, or segments. Common for:
- Beta testers / early access
- Internal employees
- Enterprise customers with specific entitlements
- A/B test groups

### Config flags (non-boolean)
For tunable parameters: rate limits, batch sizes, timeout values. Enable runtime tuning without redeploys.

```python
RATE_LIMIT_PER_MINUTE = config.get_int("api_rate_limit_per_minute", default=100)
```

---

## Secrets Management

### What counts as a secret
- Database credentials (username + password)
- API keys and tokens (any key that grants access to an external service)
- Signing keys and certificates (JWT signing keys, TLS private keys, HMAC secrets)
- Encryption keys
- OAuth client secrets

**Not secrets** (but still environment-specific): Database hostnames, service URLs, log levels, feature flag names.

### Secrets manager tools

| Tool | Best for | Notes |
|------|----------|-------|
| AWS Secrets Manager | AWS-hosted apps | Native AWS integration, automatic rotation support |
| HashiCorp Vault | Multi-cloud, self-hosted | Most flexible; steeper ops overhead |
| GCP Secret Manager | GCP-hosted apps | Native GCP integration |
| Azure Key Vault | Azure-hosted apps | Native Azure integration |
| Doppler | Any cloud, simpler UX | Good for small teams, syncs to env vars |

### Accessing secrets at runtime

**Preferred: inject as environment variables at container/process startup**
```bash
# Kubernetes (via external-secrets operator or equivalent)
env:
  - name: DATABASE_PASSWORD
    valueFrom:
      secretKeyRef:
        name: db-credentials
        key: password
```

**Acceptable: read from secrets manager SDK at startup, cache in memory**
```python
import boto3
secrets = boto3.client('secretsmanager')
DB_PASSWORD = secrets.get_secret_value(SecretId='prod/db/password')['SecretString']
```

**Never: hardcode in source, store in `.env` files committed to version control, pass via CLI argument**

### Startup validation pattern
Fail fast on missing config at application startup:

```python
def validate_config():
    required = ['DATABASE_URL', 'API_KEY', 'JWT_SECRET']
    missing = [key for key in required if not os.environ.get(key)]
    if missing:
        raise EnvironmentError(f"Missing required config: {', '.join(missing)}")

# Call before any application code runs
validate_config()
```

---

## Environment Hierarchy

### Typical environment chain
```
local dev → CI → staging → production
```

Each environment should have a complete, independent configuration. Avoid sharing config between environments — shared config leads to "it works in staging because staging reads prod's config."

### Config loading priority (highest to lowest)
1. Environment variables (set by the runtime environment)
2. `.env.local` (local developer overrides, never committed)
3. `.env.[environment]` (environment-specific committed defaults, no secrets)
4. `.env` (shared defaults, no secrets)
5. Hard-coded defaults in application code

### What belongs in version control

| File | Purpose | Secrets? | Commit? |
|------|---------|---------|---------|
| `.env.example` | Documents all required vars with example values | No | Yes |
| `.env.development` | Dev defaults, no real secrets | No | Yes |
| `.env.staging` | Staging non-secrets | No | Yes |
| `.env` | Local overrides | No | No (add to .gitignore) |
| `.env.local` | Personal dev overrides | No | No |
| `.env.production` | Never — use secrets manager | — | Never |

---

## Config Validation Patterns

### Type-safe config with validation

```typescript
// TypeScript example with runtime validation
const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  databaseUrl: requireEnv('DATABASE_URL'),
  jwtSecret: requireEnv('JWT_SECRET'),
  logLevel: process.env.LOG_LEVEL ?? 'info',
  featureFlagServiceUrl: process.env.FEATURE_FLAG_URL ?? null,
};

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Required environment variable ${key} is not set`);
  return value;
}
```

### Config schema documentation

Document every config variable. Keep this in sync with `.env.example`:

```
DATABASE_URL            Required. PostgreSQL connection string.
                        Format: postgres://user:pass@host:port/dbname
JWT_SECRET              Required. Min 32 chars. Used to sign auth tokens.
LOG_LEVEL               Optional. Default: 'info'. Values: debug|info|warn|error
FEATURE_FLAG_URL        Optional. LaunchDarkly SDK URL. Feature flags disabled if unset.
```
