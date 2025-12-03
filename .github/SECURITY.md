# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.0.x   | :white_check_mark: |

## Reporting a Vulnerability

Please report security vulnerabilities via GitHub Security Advisories.

## Known Issues

### Remaining Dev Dependencies

The `@angular/cli` package depends on `@modelcontextprotocol/sdk` which has a known vulnerability (GHSA-w48q-cv73-mx4w). This is a **dev dependency only** and does not affect production builds.

### Mitigation

- This package is only used during development for CLI tooling
- Production builds do not include dev dependencies
- We monitor for upstream fixes via Dependabot
- The vulnerability requires local access to exploit
