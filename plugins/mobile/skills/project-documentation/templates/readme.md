# README Template

Adapt this template based on project type. Remove sections that don't apply. Every section should earn its place — if it doesn't help the reader use or understand the project, cut it.

```markdown
# Project Name

[One-line description: what this does and why someone would use it.]

[Optional: badges for build status, coverage, npm version, license]

## Overview

[2-4 sentences expanding on the one-liner. What problem does it solve? Who is it for?
Include a screenshot, GIF, or terminal recording if visual.]

## Quick Start

[The fastest path from zero to working. Should be 3-5 steps maximum.]

```bash
# Install
npm install project-name

# Basic usage
import { thing } from 'project-name';
const result = thing('input');
```

## Prerequisites

[Only list what's NOT obvious. If it's a Node.js project, listing Node is expected.]

- Node.js >= 18
- PostgreSQL >= 14
- Docker (for local development)

## Installation

[Complete setup instructions. Be specific about versions.]

```bash
git clone https://github.com/org/project-name.git
cd project-name
npm install
cp .env.example .env  # Edit with your values
npm run db:migrate
```

## Usage

[How to use the project. Examples should be copy-pasteable.]

### Basic Example

```javascript
// Show the most common use case
```

### Configuration

[Environment variables, config files, CLI flags — whatever the user needs to customize.]

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://localhost:5432/mydb` |
| `PORT` | Server port | `3000` |

## Development

[How to work on this project.]

```bash
npm run dev          # Start development server
npm test             # Run tests
npm run lint         # Check code style
npm run build        # Build for production
```

### Project Structure

[Only include if the structure is non-obvious or the project is large.]

```
src/
  services/    # Business logic
  routes/      # API endpoints
  models/      # Database models
  utils/       # Shared utilities
tests/         # Test suites
```

## API Reference

[For libraries: document the public API. For web APIs: link to full API docs.]

### `functionName(param1, param2)`

[Description of what it does.]

**Parameters:**
- `param1` (string) — Description
- `param2` (object, optional) — Description

**Returns:** Description of return value

**Example:**
```javascript
const result = functionName('hello', { verbose: true });
```

## Contributing

[Brief summary + link to CONTRIBUTING.md if it exists.]

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

[License type] — see [LICENSE](LICENSE) for details.
```
