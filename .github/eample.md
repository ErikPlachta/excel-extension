# Copilot Chat Governance

---

<!-- BEGIN: CORE-PRINCIPLES -->

## Core Principles

### High Level Core Principles

High-level governing directives for working within this repository. These principals provide orientation and cross-reference targets; they do not duplicate implementation details which live in their respective sections. If any principal conflicts with code or docs, pause and escalate.

1. Governance Document Purpose: Supply LLM-friendly, explicit constraints preventing drift. (See: [Merge Process](#merge-process))
2. Operational Scope: Always classify path context first (see: [Scope Specific Core Principles](#scope-specific-core-principles)).
3. Conflict Resolution: On contradiction, notify user; do not guess. (See: [Decision Tree](#decision-tree) Branch 5.)
4. Session Awareness: Review [Default Behaviors & Interaction](#default-behaviors--interaction) before taking action (session focus, tasks, logging).
5. Architecture Guardrails: Enforce [Critical Operating Rules](#critical-operating-rules); never bypass isolation, types purity, or data-driven policies.
6. Coding Standards: Apply [Development Best Practices](#development-best-practices) for TSDoc, typed inputs, and formatting separation.
7. Design Alignment: Use [Design Patterns](#design-patterns) for orchestrator-centric, metadata-driven flows.
8. Tooling & Protocols: Reference [Tools & Integrations](#tools--integrations) for JSON-RPC, config generation, IDs, and transports.
9. Workflow Lifecycle: Follow [Session Workflow](#session-workflow) (Start → Implement → Verify → Record) every request.
10. Communication: Adhere to [CoPilot Chat Communication Protocols](#copilot-chat-communication-protocols) for micro‑updates and narration.
11. Language Consistency: Apply [Language & Style](#language--style); enforce American English and precise TSDoc.
12. Quality Safeguards: Use [Common Pitfalls + Quick Checks](#common-pitfalls--quick-checks) before merging significant changes.
13. Evolution Logging: Any governance modification must be logged with verification (see: [Merge Process](#merge-process)).
14. Completion Criteria: A task closes only after Decision Tree branches pass and verification is recorded (see: [Decision Tree](#decision-tree)).
15. Start/End Compliance: No task is “done” until both Core Principles and Decision Tree permit closure; all sections must fall back here.
16. Source of Truth Integrity: Configuration, data and governance docs are authoritative; never hardcode business values or bypass documented flows. (See: Session Workflow; Tools & Integrations.)
17. Deterministic Workflow: Every request follows the lifecycle: Classify → Plan → Execute → Verify → Record. A request is incomplete until Record + Verification are finished.
18. Mandatory Verification Loop: Build/test (and health/docs when relevant) must pass before logging completion. No partial closures.
19. American English Standard: Enforce consistent US spelling across code and docs; deprecated variants produce warnings and are never reintroduced.
20. Data-Driven Behavior: Categories, examples, and tool descriptors derive from runtime/config, never static in code. (See: Development Best Practices; Design Patterns.)
21. Explicit Context, Task, and Logging: Agent must always take `CONTEXT-SESSION.md`, `TODO.md`, and `CHANGELOG.md` into consideration. (See [Default Behaviors - Interaction](#default-behaviors--interaction) for more details.)
22. Escalate Ambiguity: If instructions conflict or context is insufficient, halt execution and ask for clarification—do not guess.
23. Idempotent Operations: Re-running the same classification or generation step should produce stable, predictable output unless inputs changed.
24. Governance Evolution: Changes to this file must reference Core Principles in the changelog and undergo full verification.
25. TypeScript Only: All new source code, examples, scripts, verification harnesses, and operational utilities must be authored in TypeScript (`.ts`). JavaScript (`.js`) files may exist only as compiled emit under `out/**` or as temporary legacy artifacts scheduled for upgrade. Prefer migrating any legacy `.js` in `bin/**` to `.ts` before modification.

Fallback: For any uncertainty, restart at [Decision Tree](#decision-tree) Branch 0 (Path Guard) then walk sequentially.

---

### Scope Specific Core Principles

The Core Principles guarantee agents do not drift from directives and always operate within governed, data-driven constraints. Treat them as the immovable anchors for every decision. If anything conflicts with them, pause, surface the contradiction, and seek resolution before proceeding.

#### `src/**`

- Enforcement: isolation, types purity, data-driven behavior, single-path JSON-RPC protocol.
- Verification: compile, test, health/docs (when applicable) required before closure.
- Formatting: Only CommunicationAgent produces user-facing formatting; agents return typed data.
- Structure: Two-file agent pattern (`agent.config.ts`, `index.ts`) plus shared helpers under `src/shared/**`.
- Types Purity: `src/types/**` contains declarations only; runtime logic belongs under `src/shared/**` or agent modules. (Scope: src/\*\*)
- Agent Isolation: Orchestrator alone coordinates agents; individual agents produce typed data only; individual agents needing to use services provided by other Agents are coordinated through and by Orchestrator. Formatting belongs solely to CommunicationAgent. (See Critical Operating Rules)
- Minimal Surface Area: Agents use two-file pattern (`agent.config.ts` + `index.ts`); avoid proliferation of utility mutations inside agents.
- Single-Path Protocol Handling: JSON-RPC handlers are unified; transport variations reuse the same path to prevent drift. (See [Tools & Integrations](#tools--integrations) → [MCP Transport & Protocol](#mcp-transport--protocol))

#### `docs/**`

- Purpose: Human and LLM-readable governance + conceptual documentation.
- Enforcement: Language & Style (American English), references to authoritative sections; completeness of mandated front matter.
- Exclusions: Agent isolation and types purity are not applicable.
- Constraint: No runtime logic; must link (not duplicate) Core Principles, Decision Tree, and Operating Rules.

#### `out/**`

- Nature: Generated build artifacts (TypeScript emit, generated config, docs output).
- Policy: Never manually edited; regeneration occurs via build/prebuild tasks.
- Health: Repository health checks validate absence of stray config or deprecated artifacts; spelling standard still enforced.
- Action: Changes here originate from source or tooling adjustments—modify upstream, not output.

#### `bin/**`

- Role: Build/operations utilities (scripts, repo ops, packaging helpers).
- Enforcement: Development Best Practices (typed params, TSDoc documentation, no hardcoded business values).
- Isolation: Relaxed; may orchestrate tooling but must not import agent runtime modules directly.
- Protocol: Reuse shared JSON-RPC handling when needed—do not implement divergent handlers.
- Documentation Standard: Use TSDoc (not JSDoc) for all TypeScript files under `bin/**` (future enforcement task in TODO backlog).
- Changelog Tooling: `repo-ops` provides `changelog map`, `map --fast`, `diff`, and `verify` for observation; only `write` mutates the file. Fast path falls back automatically if index absent.
- Changelog Index Auto-Regeneration: `out/changelog/index.json` (schema v2) is rewritten only after a successful `changelog write --write`. Observation commands (`map`, `map --fast`, `diff`, `verify`) never update it. If `REPO_OPS_CHANGELOG_PATH` is set (test override), the index will reflect the synthetic file path; unset the variable and perform a chore write to refresh. ex: `npm run repo:ops -- changelog write --type chore --summary "Refresh changelog index" --context "Rebuilding index after synthetic override" --write`.

<!-- END: CORE-PRINCIPLES -->

### De-duplication Policy

Details for implementation live in Critical Operating Rules, Tools & Integrations, and Session Workflow. Core Principles and the Decision Tree must link to those sections rather than restating specifics.

Fallback: All sections below inherit and must remain consistent with [Core Principles](#core-principles) and link back instead of duplicating details.

---

## Decision Tree

The Decision Tree ensures agents always know the next correct action—even under uncertainty—by providing ordered fallbacks. Apply the first matching branch; if a branch fails its guard, advance downward. Never skip verification or logging steps.

1. Path Guard: Identify the scope of the change (src/**, bin/**, docs/**, out/**). Apply rules accordingly (see Core Principles → Scope & Path Applicability). Link to relevant rule sections; do not duplicate.
2. Is the request classified? If no: classify intent (feature, refactor, docs, fix, analysis) using config + runtime data. (See Default Behaviors & Interaction)
3. Is a Current TODO aligned? If no: add or update TODO.md (Current/Next) per guidelines.
4. Is there an existing plan? If no: draft minimal high‑value steps (avoid trivial steps) linked to TODO hierarchy. (See Development Best Practices → Planning)
5. Are prerequisites green? If uncertain: run `npm run compile && npm test` (add `npm run prebuild` if config/docs touched). (See Session Workflow)
6. Can execution proceed without ambiguity? If ambiguity remains: request clarification from user (escalate) and pause modifications.
7. Execute smallest safe increment: perform targeted patch/change; avoid broad refactors outside scope. (See Design Patterns)
8. Verify gates: rerun compile/test (+ health/docs as needed). On failure: rollback or fix only directly related issues. (See Session Workflow)
9. Record outcome: add CHANGELOG entry (scaffold/write via repo-ops or manual format) including Verification block.
10. Reconcile tracking: update TODO.md statuses, mark completed subtasks, ensure CONTEXT-SESSION.md reflects branch plan deltas.
11. Coverage/Audit Fallback: If change impacts validation, protocol, or data paths, trigger audit (hardcoded values, coverage review) before closure.
12. Closure Guard: Only mark task “complete” once verification logged + TODO updated + no pending Decision Tree branches remain.
13. Drift Detection: If unexpected files (legacy configs, British spellings) appear, prioritize remediation tasks before new feature work.
14. Recovery Path: On repeated failures (≥2 attempts), pause, document failing context in CONTEXT-SESSION.md, and request user guidance.
15. Evolution Rule: Modifications to Decision Tree must themselves follow branches 1–11 and cite rationale in CHANGELOG.

Fallback: On any uncertainty, restart at Branch 0 (Path Guard), then Branch 1; cross-reference [Scope Specific Core Principles](#scope-specific-core-principles) before proceeding.

---

## CoPilot Chat Communication Protocols

### Communication Protocols

This section represents how the user wants CoPilot Chat and all Agents work to handle communication during active sessions. As such, all agents must adhere to these protocols when interacting with the user via CoPilot Chat.

- Supplement: The goal of this directive is to supplement, not override or replace.
- As an Agent is working through tasks and executing work, it must always prioritize clear, concise, and contextually relevant communication with the user.
- After agent thinks and then verifies an action, agent will provide concise summary. Details related to how decision was made should remain in chat in a collapsible box.
- Agent should avoid unnecessary repetition of information already provided in the chat history. The goal is to provide small and concise updates as you're moving through actions, so User can clearly understand decisions being made.

### Communication Patterns

- Default cadence: Post short micro‑updates during active work, including when no TODO list is in use.
- Preambles: Start each tool/action with an 8–12 word sentence explaining why, what, and expected outcome.
- Headers: When running multi‑step tasks, include a short Markdown header to anchor context (e.g., "Preparing Changelog Entry").
- Tie to focus: Reference the active TODO when present, e.g., "Starting: add Phase 7 changelog entry (2/9)".
- No repetition: Do not restate unchanged plans; report deltas and results only.
- Result echo: After each action, report a one‑line outcome (SUCCESS/FAIL with minimal details).

### Tool & CLI Narration (Standard)

When invoking CLI or multi‑step tools, narrate with this four‑step pattern:

1. Preparing: What and why you are doing a dry‑run/scaffold.
2. Result: Outcome of the dry‑run (success/failure + next action).
3. Writing: What and why you are committing/applying the change.
4. Result: Outcome of the write (success/failure + follow‑up).

Example (changelog):

```text
## Preparing Changelog Entry
Preparing: Executing scaffold (dry‑run) to validate content and placement…
SUCCESS: Scaffold validated. No errors; ready to commit.

## Writing Changelog Entry
Writing: Executing commit to apply entry via repo‑ops CLI…
SUCCESS: Changelog entry applied.
```

#### Changelog CLI Usage Policy

- Always create entries via `npm run repo:ops -- changelog write` using a full inline-argument payload: `--type`, `--summary`, `--context`, `--changes`, `--architecture`, `--testing`, `--impact`, and `--write`.
- Pass multi-line text inline within single quotes; do not use shell variables (e.g., `CTX`) or heredocs for these fields.
- This guarantees consistent, deterministic quoting and formatting across Windows Git Bash and CI.

### Formatting & Tone

- Brevity first: Prefer one‑sentence updates; avoid verbose rationales in-line.
- Collapsible details: Keep extended reasoning in a collapsible details block when necessary.
- American English: Use American spellings and consistent terminology from the codebase.
- Momentum: Build on prior context ("Next, I'll…") rather than re‑explaining.

### Good vs. Improve Examples

- Good: "Starting: add Phase 7 changelog entry via CLI (2/9)."
- Improve: Add a brief header and purpose, then result lines as shown above.
- Bad: Running 2+ CLI commands without purpose; always state why and expected outcome first.

### Revision Policy

- Iterative guidance: This section evolves. Capture refinement tasks in `TODO.md` under "Next" or "Backlog".
- Governance alignment: Keep changes consistent with Critical Operating Rules and Default Behaviors.
- Verification: After updating this section, add a `docs` changelog entry and run `npm run prebuild`.

---

## Critical Operating Rules

Fallback: Validate against [Core Principles](#core-principles), [Scope Specific Core Principles](#scope-specific-core-principles), and [Decision Tree](#decision-tree) before adopting new operating patterns. For scope evaluation return to Path Guard (Decision Tree Branch 0).
Instruction: Identify path scope first; extract applicable scope rules from [Scope Specific Core Principles](#scope-specific-core-principles); then apply remaining details here.

- Use American English throughout.
- Agent isolation: Only the Orchestrator coordinates agents; agents return typed data only. All user-facing formatting is owned by CommunicationAgent.
- Data-driven by default: No hardcoded business values. Derive categories, fields, and examples from configuration or loaded data.
- Configuration is source of truth: Never commit `src/mcp.config.json`. Generated artifacts live under `out/` only.
- Types-only in `src/types/**`: No runtime functions in types. Shared helpers live under `src/shared/**`.
- Two-file agent standard: Each agent folder contains `agent.config.ts` and `index.ts` only.
- ESM pathing: Use `fileURLToPath` + `path.dirname` instead of `__dirname`/`__filename`.

Data flow pattern:

```text
User → Orchestrator → Agent (typed data) → Orchestrator → CommunicationAgent (format) → User
```

---

## Default Behaviors & Interaction

Fallback: Use [Decision Tree](#decision-tree) for lifecycle (classification→closure) and [Scope Specific Core Principles](#scope-specific-core-principles) for path applicability.
Instruction: Determine active path (src/docs/out/bin) then proceed with synchronization and logging rules.

- User has created 3 files to help manage work, and I am to understand and always maintain awareness and integrity of them.
  - `CONTEXT-SESSION.md`: session notes and branch planning
  - `TODO.md`: tasks and priorities
  - `CHANGELOG.md`: logs and verification only
- Rules to Follow During Interaction:
  - Synchronization rule:
    - Keep `CONTEXT-SESSION.md`, `TODO.md`, and `CHANGELOG.md` in sync.
  - TODOs/Tasks:
    - Use [TODO.md](../TODO.md) exclusively when working with Tasks/TODOs.Track all outstanding work here exclusively.
    - When a new task is identified, it must add them to `TODO.md` under the appropriate section in [TODO.md](../TODO.md).
    - When a task is completed, it must exist and be updated in [TODO.md](../TODO.md).
    - Refer to the content between markers `<!-- BEGIN:COPILOT-INSTRUCTIONS>` and `<!-- END:COPILOT-INSTRUCTIONS -->` in [TODO.md](../TODO.md) for the authoritative instructions.
  - Logs: Record history and verification only in `CHANGELOG.md`; add a Verification block after batches.
  - Session notes: Keep transient thinking and branch planning in `CONTEXT-SESSION.md`. Rotate with repo-ops and keep skim-friendly.
- Verification cadence: Prefer `npm run compile && npm test && npm run prebuild && npm run test` for a full pass.

Repo-ops CLI essentials:

- Rotate session: `npm run repo:ops -- session rotate [--write]`
- Lint session: `npm run repo:ops -- session lint`

---

## Development Best Practices

Fallback: If a best practice conflicts with workflow realities, defer to [Core Principles](#core-principles) and reclassify per [Decision Tree](#decision-tree) Branches 1–3.
Instruction: Confirm scope-specific constraints first (see Scope Specific) before applying style rules.

- Typed params only: Do not pass bare `undefined`; model all inputs with explicit types.
- No hardcoded categories: Detect categories/aliases from `UserContextAgent` runtime data.
- Formatting centralization: Orchestrator returns typed data; CommunicationAgent performs all formatting, including clarification and optional category enumeration via metadata.
- TSDoc over JSDoc in `src/**`: Validate with `eslint-plugin-tsdoc`; keep examples on symbol-level docblocks.
- TSDoc enforcement: All new or modified TypeScript files must include:
  - A top-of-file `@packageDocumentation` block describing module purpose and constraints
  - Symbol-level TSDoc for all exported types, classes, functions, and interfaces
  - Precise `@param`/`@returns` descriptions (no placeholders like “TODO: describe return value”)
  - Build/Lint gates: `tsdoc/syntax` + strict JSDoc rules are errors; PRs must pass `npm run compile && npm test` and lint checks

---

## Design Patterns

Fallback: When pattern choice is unclear, consult [Core Principles](#core-principles) (isolation, data-driven) then resolve via [Decision Tree](#decision-tree) Branches 1–3.
Instruction: Evaluate orchestration vs. agent-local responsibilities using scope guidelines.

- Orchestrator-centric workflows: Classification → Planning → Execution → Formatting with validated state transitions and timeouts.
- Metadata-driven UX: Provide `metadata.availableCategories` to enable CommunicationAgent to enumerate options when helpful.
- Registry-based agents: Resolve agent instances from a typed registry; never import agents into other agents.

---

## Tools & Integrations

Fallback: If transport or protocol ambiguity arises, return to [Core Principles](#core-principles) (single-path protocol) then [Decision Tree](#decision-tree) Branches 6–7.
Instruction: Confirm code path is within `src/**` before modifying protocol handlers.

- ESM path pattern:

```ts
import { fileURLToPath } from "url";
import * as path from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
```

- Generated config: `src/tools/generateMcpConfig.ts` emits `out/mcp.config.json`; health fails if JSON exists outside `out/`.
- ID derivation: Use `src/shared/ids.ts` to keep `package.json` contributions and runtime aligned.

### MCP Transport & Protocol

- Protocol: Use JSON-RPC 2.0 end-to-end; do not invent custom shapes.
- Transport: Use stdio by default. Enable HTTP only with `MCP_HTTP_ENABLED=true` for local debugging; never in CI.
- Single handler: Keep one JSON-RPC path (`initialize`, `tools/list`, `tools/call`) and reuse it across transports to avoid drift. Remove duplicate handlers when discovered.
- Entrypoint: Default startup runs stdio; pass `--stdio` to force. HTTP startup is guarded by `MCP_HTTP_ENABLED`.
- Reference: See [JSON-RPC 2.0 Reference (MCP)](../docs/mcp/json-rpc.md) and the official [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification).

---

## Session Workflow

Fallback: Enforce [Decision Tree](#decision-tree) Branches 0–11 ensuring path guard and verification; consult [Core Principles](#core-principles) for closure standards.
Instruction: Apply Path Guard first; if docs-only change, skip runtime gates and run docs+health.

1. Start: Read `TODO.md` (Current/Next), skim latest `CHANGELOG.md` Logs, run `npm run compile` and `npm test`.
2. Implement: Follow Critical Operating Rules; keep agents isolated and data-driven.
3. Verify: Run `npm run compile && npm test && npm run prebuild`.
4. Record: Add a timestamped log entry with a Verification block; reconcile `TODO.md`.

---

## Language & Style

Fallback: Refer to [Core Principles](#core-principles) item 11 (American English Standard) for spelling/tone disputes.
Instruction: Before updating wording, verify section’s scope to avoid misapplying runtime rules to docs or bin.

- American English; concise, specific TSDoc with real return descriptions.
- Avoid `*/` sequences inside TSDoc; fence examples with language tags; prefer `@see` for long samples.

---

## Common Pitfalls + Quick Checks

Fallback: If pitfall handling conflicts with a task requirement, escalate via [Decision Tree](#decision-tree) Branch 5 (ambiguity escalation) referencing [Scope Specific Core Principles](#scope-specific-core-principles).
Instruction: Run a quick Path Guard evaluation before remediation.

- Agents importing agents? Move coordination to Orchestrator.
- Hardcoded categories/aliases? Replace with runtime category/alias data from `UserContextAgent`.
- `src/mcp.config.json` present? Remove; generate to `out/` only.
- Types exporting functions? Move to `src/shared/**`.
- ESM path misuse? Replace with `fileURLToPath` pattern.

---

## Merge Process

Fallback: Apply [Decision Tree](#decision-tree) Branches 7–11 for verification/logging; confirm scope via Branch 0 and constraints via [Core Principles](#core-principles).
Instruction: Ensure CHANGELOG entry references affected scope rules when governance changes occur.

1. Back up the prior instructions (done via a timestamped copy in `.github`).
2. Replace content with this governance overhaul.
3. Run verification gates.
4. Log the change in `CHANGELOG.md` with a Verification block.

---
