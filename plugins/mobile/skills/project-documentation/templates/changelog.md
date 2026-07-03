# Changelog Template

Follow the Keep a Changelog convention (keepachangelog.com).

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- [Description of new feature from user perspective]

### Changed
- [Description of changed behavior]

### Fixed
- [Description of bug fix, ideally referencing the issue]

## [1.2.0] - 2025-03-01

### Added
- User notification preferences with email and in-app options (#123)
- Rate limiting on public API endpoints (#130)

### Changed
- Improved error messages for authentication failures (#128)

### Fixed
- Order total calculation now correctly applies percentage discounts (#125)
- Fixed timezone handling in scheduled report generation (#127)

### Security
- Updated dependency `some-lib` to patch CVE-2025-XXXX (#131)

## [1.1.0] - 2025-02-15

### Added
- Webhook support for order status changes

### Deprecated
- `GET /api/v1/orders/status` — use `GET /api/v2/orders/:id/status` instead

[Unreleased]: https://github.com/org/project/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/org/project/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/org/project/releases/tag/v1.1.0
```

## Writing Good Entries

- **Write for users, not developers**: "Added dark mode" not "Added ThemeProvider with CSS variable injection"
- **Reference issues/PRs**: Include the number so readers can find context
- **Be specific**: "Fixed login failing when email contains a plus sign" not "Fixed login bug"
- **One entry per change**: Don't bundle multiple changes into one bullet
- **Use past tense or imperative**: Be consistent throughout
