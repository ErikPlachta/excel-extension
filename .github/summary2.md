# Copilot Governance Summary v2

This file refines the original `summary.md` to make it easier for GPT‑5.1/Copilot Chat to generate robust `copilot-instructions.md` files for any project, with stronger emphasis on fallbacks, less hard-coded path assumptions, and an example content template.

## Instructions for LLMs

When Copilot Chat reviews this file, it should treat it as a meta-blueprint for creating or updating governance instructions in other repositories.

High-level usage:

- Use the **workflow steps** below to analyze the target repo and spin up planning/draft files.
- Use **Content Guidelines** as a checklist of sections and concepts your generated governance file should include.
- Use **Fallback Guidance** to decide what to do under ambiguity or missing context.
- Use **Content Template** as a compact, concrete example of a well-structured `copilot-instructions.md` to keep output consistent and avoid drift.

### How to Use this Summary to Create New Governance Instructions

1. **Create a planning doc:** Create `copilot-instructions-planning.md` under `.github/` in the target repo. Add a short header and explain that this file is for Copilot’s analysis and planning steps.
2. **Map project structure:** In `copilot-instructions-planning.md`, document the key areas of the project: source code, tests, documentation, build artifacts, scripts/tooling, and any obvious generated-output folders. Capture languages, frameworks, and their apparent roles. Use `package.json`, build config, or other metadata to infer commands.
3. **Verify project intent:** Add a `## Verify Project State` section to the planning doc. Summarize project goals, requirements, and design intentions derived from `README` files, code comments, existing docs, and any existing `copilot-instructions.md`. Note open questions or conflicting signals.
4. **Ensure planning/logging files exist:** In the repo root (or designated “ops” folder), ensure that files for tasks, session notes, and change history exist (commonly `TODO.md`, `CONTEXT-SESSION.md`, `CHANGELOG.md`). If missing and allowed, create them with minimal starter content.
5. **Draft the governance file:** Create `copilot-instructions-draft.md` in `.github/`. Using information from the planning doc and the **Content Guidelines** section below, draft the new governance instructions. Adapt sections to the project’s architecture, tools, and vocabulary.
6. **Adapt references:** Replace any generic names, paths, or commands in your draft with ones that match the target project (e.g., `src/` vs `app/`, `npm test` vs `pnpm test`, Python vs TypeScript).
7. **Converge to final file:** Once the draft is reviewed/iterated, rename or copy it to `copilot-instructions.md` as the canonical governance file.

---

## Content Guidelines

### 1. Overall Design

- **Purpose:** Provide LLM-friendly, explicit guardrails that prevent behavior drift and enforce a deterministic request lifecycle (Classify → Plan → Execute → Verify → Record).
- **Structure:** Keep a small set of top-level sections (Core Principles, Scope Rules, Decision Tree, Communication Protocols, Operating Rules, Workflows, etc.) that reference each other instead of duplicating details.
- **Scope Awareness (Conceptual, not Path-Specific):** Clearly distinguish between logical areas of the project (e.g., runtime code, documentation, generated artifacts, tooling/ops scripts) without hardcoding exact directory names. The governance file for a specific repo can then bind these conceptual areas to concrete paths.
- **Verification & Logging:** Define what “done” means, typically: automated checks pass (build/tests/docs/health as relevant) and changes are reflected in tracking/logging artifacts (e.g., TODOs and changelog).
- **Key Design Intention:** Each major section in the governance file should:
  - Explain **what problem it solves** for the model.
  - Include at least one **Fallback** line and one **Instruction** line so Copilot has both: (a) a default action under uncertainty, and (b) an explicit “happy path” behavior.

**Fallback Examples (patterns to reuse):**

- `Fallback: For any uncertainty, restart at the Decision Tree Path Guard and walk branches sequentially.`
- `Fallback: Validate against Core Principles and Scope Rules before adopting new operating patterns.`
- `Fallback: Use the Decision Tree for lifecycle (classification→closure) and Scope Rules for applicability.`
- `Fallback: If a best practice conflicts with actual workflow realities, defer to Core Principles and reclassify the request.`

**Instruction Examples (patterns to reuse):**

- `Instruction: Identify which logical area (runtime code, docs, generated output, tooling) is affected; apply its scope rules before making changes.`
- `Instruction: Determine the active area and then follow the synchronization and logging rules for that area.`
- `Instruction: Confirm area-specific constraints before applying development or style rules.`

When adapting to a concrete project, translate “logical areas” into that project’s real paths (e.g., “runtime code → `src/**`”, “docs → `docs/**`”) in the final governance file, but keep this summary more abstract.

---

### 2. Core Principles Pattern

**What this section solves:** Provides global, non-duplicated “laws” that every other section must obey.

Key ideas to carry into new projects:

- **Single source of truth:** Configuration, governance docs, and dedicated planning/logging files (e.g., for TODOs, session notes, and changelog/verification) are authoritative. Code should not hardcode business rules that belong in config or governance.
- **Deterministic lifecycle:** Every request follows the same phases: classify the ask, plan minimal steps, execute a focused change, verify with tooling, and then record outcomes.
- **Safety defaults:** On conflict or ambiguity, Copilot should pause, surface the issue, and request clarification instead of guessing.
- **Language standard:** Pick a single language/style standard (e.g., American English, TSDoc or JSDoc) and enforce it across docs and comments.
- **Stack constraints:** Declare hard boundaries (e.g., “TypeScript only for new code” or “Python 3.11+ only”) so the model never chooses unsupported languages or patterns.

**Typical Fallback:**

- `Fallback: If a requested change appears to violate Core Principles, stop, describe the conflict, and ask the user for direction before proceeding.`

---

### 3. Scope Rules by Logical Area

**What this section solves:** Teaches Copilot how behavior should change depending on _what kind_ of artifact it touches, without hard-wiring specific folder names.

Recommended logical areas:

- **Runtime Code Area:**
  - Focus on type safety, decomposition, and data-driven behavior.
  - Respect architecture patterns (e.g., orchestrators vs. workers, services vs. components).
  - Require compile/test (or equivalent) before considering a task complete.

- **Documentation Area:**
  - Prioritize clarity, cross-linking to authoritative sections, and consistent language.
  - Prohibit runtime logic; docs should describe, not execute.

- **Generated Output Area:**
  - Treat generated artifacts as read-only; always regenerate via the appropriate build or tooling command instead of editing.

- **Tooling / Ops Area:**
  - Allow richer operational logic (scripts, CLIs) but still require typing and documentation where the stack supports it.
  - Encourage reuse of shared helpers instead of duplicating logic.

In a specific `copilot-instructions.md`, you would map these areas to actual paths (for example: “Runtime code area corresponds to `src/**` and `app/**`”), but keep this summary focused on the concept so it works across repo layouts.

**Typical Fallback:**

- `Fallback: If the logical area cannot be determined confidently, treat the change as affecting runtime code and apply the strictest verification rules, then ask the user to confirm.`

---

### 4. Decision Tree (Execution Flow)

**What this section solves:** Provides a universal flowchart so Copilot always knows the next correct action and does not skip planning, tests, or logging.

Reusable structure:

1. **Path/Area Guard:** Identify which logical area of the project is affected and load its scope rules.
2. **Classify Request:** Decide if the ask is a feature, bugfix, refactor, documentation change, or analysis.
3. **Align with Tasks:** Ensure work aligns with an existing task; if none exists and creation is allowed, add an appropriate entry to the project’s task tracker (e.g., `TODO.md`).
4. **Plan Minimal Steps:** Draft a concise, high-value plan (no trivial steps) linked to the identified task.
5. **Check Prerequisites:** Optionally run compile/test or fast health checks to establish a clean baseline.
6. **Resolve Ambiguity:** If requirements or constraints remain unclear, ask for clarification and pause modifications.
7. **Execute Focused Changes:** Implement the smallest safe increment, staying inside architectural and style constraints.
8. **Verify:** Run tests/build/docs relevant to the change.
9. **Record:** Update changelog/history and task status to reflect what actually changed and was verified.
10. **Close or Escalate:** Only mark work “complete” when verification and logging are done; otherwise document failures and request guidance.

**Typical Fallback:**

- `Fallback: If unsure which branch of the Decision Tree applies, restart from the Path/Area Guard and walk each branch in order until a clear match is found.`

---

### 5. Communication Protocols for Copilot Chat

**What this section solves:** Defines how Copilot should narrate its work, making behavior predictable and low-noise.

Patterns to generalize:

- **Micro-updates:** Provide short progress messages tied to the active task, especially before and after running tools.
- **Preambles:** Before executing commands or tools, briefly state what will run and why.
- **Result echo:** After each action, summarize success/failure and the next step in one line.
- **Avoid repetition:** Don’t restate unchanged plans; report only deltas.
- **Tone and formatting:** Keep language concise and professional; use headings when they improve scanability.

**Example Codeblock (Communication Snippet):**

```text
## Preparing Tests
Preparing: Running unit tests to verify recent changes...
SUCCESS: Tests passed; proceeding to update changelog.
```

**Typical Fallback:**

- `Fallback: If communication expectations are unclear, default to brief preambles before tools and one-line outcomes after, then ask the user whether they want more or less detail.`

---

### 6. Critical Operating Rules

**What this section solves:** Encodes non-negotiable engineering constraints.

Generalizable themes:

- **Separation of concerns:** Keep orchestration separate from worker logic and from user-facing formatting.
- **Data-driven configuration:** Move categories, IDs, and business rules into config or metadata when possible.
- **File-role clarity:** Define which areas hold types, shared helpers, runtime code, tests, etc.
- **Platform patterns:** Capture key patterns required by the stack (e.g., module resolution, framework conventions).

**Example Codeblock (Rule Snippet):**

```markdown
- Types-only Area: Contains type and interface declarations only; no runtime logic.
- Shared Helpers Area: Contains reusable functions and utilities used across modules.
```

**Typical Fallback:**

- `Fallback: If a change appears to blur responsibilities between areas (e.g., types vs. runtime), pause and request clarification or propose a refactor that restores separation of concerns.`

---

### 7. Default Behaviors, Tasks, and Changelog

**What this section solves:** Keeps Copilot aligned with project planning and history tooling.

Key ideas:

- **Planning files:** Identify where tasks, session notes, and verification history live (e.g., TODOs, session context, changelog).
- **Synchronization rule:** Ensure that task and history files are updated whenever work begins or completes.
- **Verification cadence:** Document the standard command sequence for a “full pass” (compile → test → docs, etc.).

**Example Codeblock (Task Sync):**

```markdown
- [ ] Implement feature X (linked to issue #123)
- [x] Update tests for feature X
```

**Typical Fallback:**

- `Fallback: If no formal task/logging files exist, summarize changes and verification steps directly in the chat and suggest creating minimal tracking artifacts.`

---

### 8. Development Best Practices

**What this section solves:** Aligns generated code with the project’s quality standards.

Patterns:

- Prefer typed inputs/outputs when supported by the stack.
- Define expectations for documentation (function-level comments, module docs, etc.).
- Tie practices to the project’s actual linting/formatting tools.

**Example Codeblock (TSDoc-Style Comment):**

```ts
/**
 * Calculates the total for the given items.
 * @param items List of line items including quantity and price.
 * @returns The computed total as a number.
 */
function calculateTotal(items: LineItem[]): number {
  // ...
}
```

**Typical Fallback:**

- `Fallback: If unsure about style or conventions, mirror the dominant patterns found in nearby code files and mention this choice in the summary.`

---

### 9. Design Patterns & Architecture

**What this section solves:** Keeps Copilot aligned with the project’s architecture.

Common patterns:

- **Orchestrator-first flows:** Central components or services coordinate, while leaf components stay simple.
- **Metadata-driven UX:** Use configuration or metadata to drive options instead of scattered conditionals.
- **Registries and composition:** Use registries/factories instead of direct cross-imports that tangle modules.

**Example Codeblock (Orchestrator Pattern, Pseudocode):**

```ts
// Orchestrator coordinates agents
class Orchestrator {
  async runTask(request: TaskRequest): Promise<TaskResult> {
    const plan = this.planner.createPlan(request);
    const result = await this.executor.execute(plan);
    return this.formatter.format(result);
  }
}
```

**Typical Fallback:**

- `Fallback: If the correct architectural home for new code is unclear, propose two or three candidate locations with rationale and ask the user to choose.`

---

### 10. Tools & Integrations

**What this section solves:** Teaches Copilot the sanctioned way to use the project’s tooling and external APIs.

Ideas to capture:

- The standard way to run builds, tests, formatters, or linters.
- How to regenerate generated configs or artifacts.
- Key protocol rules (REST shapes, JSON-RPC envelopes, messaging contracts) relevant to the project.

**Example Codeblock (Command Snippet):**

```bash
npm run build
npm test
```

**Typical Fallback:**

- `Fallback: If the correct command to run is unclear, search configuration files (e.g., package or build config) for scripts and suggest the most likely candidate while asking the user to confirm.`

---

### 11. Session Workflow

**What this section solves:** Describes the lifecycle of a unit of work from Copilot’s perspective.

Reusable pattern:

1. **Start:** Read active tasks and recent history; optionally run quick health checks.
2. **Implement:** Apply focused changes that follow scope and architecture rules.
3. **Verify:** Run the project’s standard verification commands.
4. **Record:** Update tasks and history to reflect what changed and how it was validated.

**Typical Fallback:**

- `Fallback: If verification cannot be run (e.g., tools unavailable), clearly state this, describe what *would* normally be run, and mark changes as needing verification.`

---

### 12. Language, Style, and Pitfalls

**What this section solves:** Keeps style consistent and calls out high-impact mistakes to avoid.

Patterns:

- Choose and enforce a language standard (e.g., American English).
- Document formatting or documentation gotchas (e.g., how to structure examples to satisfy linters or doc generators).
- List common pitfalls (editing generated files, bypassing orchestrators, hardcoding config) and preferred alternatives.

**Typical Fallback:**

- `Fallback: If style rules are unclear, adopt the most common patterns found in the nearest relevant files and mention that assumption.`

---

### 13. Merge & Governance Changes

**What this section solves:** Ensures that changes to governance itself are deliberate and verifiable.

Key ideas:

- Treat the governance file like code: back it up, test relevant flows after edits, and log changes.
- Require at least minimal verification (lint/build/test relevant paths) on governance updates.

**Typical Fallback:**

- `Fallback: If governance changes seem to conflict with existing rules, do not apply them silently; instead, present the conflict and ask for explicit confirmation.`

---

## Content Template

The following is a **minified template** that illustrates the structure of a good `copilot-instructions.md` file. GPT‑5.1 should use this as a reference to keep output consistent and to avoid drift.

```markdown
# Copilot Instructions

## Core Principles

- High-level rules for this repo (languages, frameworks, “done” definition).
- Fallback: On ambiguity, restart from Decision Tree Path/Area Guard.

## Scope Rules

- Runtime Code Area: constraints + required checks.
- Documentation Area: constraints + style.
- Generated Output Area: read-only; regenerate instead of editing.
- Tooling/Ops Area: scripting rules.

## Decision Tree

1. Path/Area Guard
2. Classify Request
3. Align with Tasks
4. Plan Minimal Steps
5. Check Prerequisites
6. Resolve Ambiguity
7. Execute Focused Changes
8. Verify
9. Record

## Communication Protocols

- Micro-updates, preambles, and result echoes.

## Critical Operating Rules

- Non-negotiable architecture and quality constraints.

## Default Behaviors & Tracking

- How to use TODOs, session notes, and changelog.

## Development Best Practices

- Code style, docs, linting expectations.

## Design Patterns & Architecture

- How new behavior should fit into existing design.

## Tools & Integrations

- Approved commands and protocol usage.

## Session Workflow

- Start → Implement → Verify → Record.

## Language, Style, and Pitfalls

- Style rules and high-impact mistakes to avoid.
```

**This template should always be adapted to the specific project (paths, commands, tech stack), but its structure and use of fallbacks should remain consistent to help GPT‑5.1 deliver predictable, high-quality behavior across repositories.**
