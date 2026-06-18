# Generated role plugins

**Do not edit by hand.** This directory is generated from `roles.json` and the
canonical `skills/` by `scripts/build-plugins.mjs`. Edit a skill under `skills/`
or the role map in `roles.json`, then re-run the generator and commit:

```bash
node scripts/build-plugins.mjs
```

Each subdirectory is a Claude Code plugin (one per role) exposed via
`.claude-plugin/marketplace.json`. See docs/ROLES.md for installation.
