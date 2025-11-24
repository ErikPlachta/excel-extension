# Changelog

## Copilot Instructions

1. Each change to governance instructions must be documented here with the date, type of change (e.g., feat, fix, docs), and a brief description.
2. Use semantic versioning principles for categorizing changes.
3. No TODOs should be tracked here; this file is only for verified changes once they are implemented.

## Logs

### 2025-11-19

#### feat: Update Governance

- Aligned `.github/copilot-instructions.md` with the meta pattern from `.github/summary3.md`, introducing:
  - `Core Principles`, `Scope Rules`, and a `Decision Tree` for Copilot behavior.
  - Explicit fallbacks for ambiguous situations (paths, tools, style, and verification).
  - Clear sections for communication protocols, development best practices, design patterns, tools, session workflow, and pitfalls.
- Clarified that `TODO.md`, `CONTEXT-SESSION.md`, and `CONTEXT-CURRENT.md` are the single sources of truth for tasks and narrative, and that `CHANGELOG.md` records verified history.
- No runtime code, manifests, or build tooling were changed as part of this governance update.
