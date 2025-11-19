# Copilot Governance Summary

This document distills the governance file into a reusable pattern for authoring `copilot-instructions.md` that guides GPT‑5.1/Copilot Chat across any VS Code project.

## Instructions

When Copilot Chat reviews this file, it should use it as a blueprint for creating or updating governance instructions in other repositories. The goal is to ensure consistent, high-quality behavior that respects each project's architecture, workflows, and verification needs.

### How to Use this Summary to Create New Governance Instructions

1. Create a new `copilot-instructions-planning.md` file in the `.github/` directory of the target repository. Add a header to it and then a summary of the files intention. (You'll be updating this document systematically as you move through this setup process.)
2. In the new `copilot-instructions-planning.md` file, create a section for file hierarchy. This should include key directories in the project (e.g., source code, tests, documentation, build artifacts, scripts) and make a note of the languages and roles they play in the application as you can understand them. (You may need to check `package.json` or other config files to understand build/test commands and dependencies.)
3. In the new `copilot-instructions-planning.md` file, create a section `## Verify Project State`, for documenting what you can extrapolate about the project's goals, requirements, and design intentions. This means reviewing `README.md` files, comments within code, and any other relevant documentation not in locations like `node_modules`, `dist/`, or `build/`. If there is already a `copilot-instructions.md` file, review it thoroughly as well.
4. In the root directory, verify `TODO.md`, `CONTEXT-SESSION.md`, and `CHANGELOG.md` are created. If not, create them with appropriate initial content.
5. Now, create a new `copilot-instructions-draft.md` file. Using the above research documented in `copilot-instructions-planning.md`, reference the below section in this file, [Content Guidelines](#content-guidelines), and start drafting the new governance instructions. Follow the patterns and structures outlined below, adapting them to the specific needs and architecture of the target repository.
6. All references to content within this file should be adapted to the specific context of the new repository, ensuring that commands, file paths, and architectural patterns align with the project's unique setup.

## Content Guidelines

---

### 1. Overall Design

- **Purpose:** Provide LLM-friendly, explicit guardrails to prevent behavior drift and ensure every request follows a deterministic lifecycle (Classify → Plan → Execute → Verify → Record).
- **Structure:** A small set of top-level sections (Core Principles, Decision Tree, Communication Protocols, Operating Rules, Workflows, etc.) that reference each other instead of duplicating details.
- **Scope Awareness:** All rules are scoped by paths and their unique role in the repository (ex: `src/**`, `docs/**`, `out/**`, `bin/**`), so the model first classifies where a change happens, then applies only the relevant constraints.
- **Verification & Logging:** No work is “done” until compilation/tests (and docs/health when relevant) pass and the change is recorded in a changelog plus TODOs.
- **Key Design Intention:** Within each section, there should be a clear
  - Fallback Examples:
    - `Fallback: For any uncertainty, restart at [Decision Tree](#decision-tree) Branch 0 (Path Guard) then walk sequentially.`
    - `Fallback: Validate against [Core Principles](#core-principles), [Scope Specific Core Principles](#scope-specific-core-principles), and [Decision Tree](#decision-tree) before adopting new operating patterns. For scope evaluation return to Path Guard (Decision Tree Branch 0).`
    - `Fallback: Use [Decision Tree](#decision-tree) for lifecycle (classification→closure) and [Scope Specific Core Principles](#scope-specific-core-principles) for path applicability.`
    - `Fallback: If a best practice conflicts with workflow realities, defer to [Core Principles](#core-principles) and reclassify per [Decision Tree](#decision-tree) Branches 1–3.`
  - Instructions Example:
    - `Instruction: Identify path scope first; extract applicable scope rules from [Scope Specific Core Principles](#scope-specific-core-principles); then apply remaining details here.`
    - `Instruction: Determine active path (src/docs/out/bin) then proceed with synchronization and logging rules.`
    - `Instruction: Confirm scope-specific constraints first (see Scope Specific) before applying style rules.`

---

### 2. Core Principles Pattern

**What this section solves:** Gives the model global, non-duplicated laws that all other sections must respect.

Key ideas to carry into new projects:

- **Single source of truth:** Configuration, governance docs, and dedicated planning files (`TODO.md`, `CONTEXT-SESSION.md`, `CHANGELOG.md`) are authoritative; code should not hardcode business rules that belong in config.
- **Deterministic lifecycle:** Every request follows the same phases: classify the ask, plan minimal steps, execute a focused change, verify with tooling, then record outcomes.
- **Safety defaults:** On conflict or ambiguity, the model must pause, surface the issue, and request clarification rather than guessing.
- **Language standard:** Enforce a single writing standard (here: American English and precise TSDoc) for all docs and code comments.
- **Tech stack constraints:** Declare hard boundaries (e.g., “TypeScript only in new source”, or your project’s equivalents) so the model never picks an unsupported language or pattern.

When drafting new instructions, start with 10–20 bullet principles that encode:

- Allowed languages and frameworks.
- What “done” means (tests/build/docs/verification).
- Where configuration and rules live.
- How to resolve conflicts and ambiguity.

---

### 3. Scope-Specific Rules by Path

**What this section solves:** Tells the model how behavior changes depending on which part of the repo it is touching.

Pattern to reuse:

- **`src/**` (runtime code):\*\*
  - Emphasize type safety, isolation between components/agents, and data-driven behavior.
  - Define architectural patterns (e.g., orchestrator vs. worker agents, services vs. components) and what each file is allowed to do.
  - Specify required verification (compile, tests, health checks) before closing work in this area.

- **`docs/**` (documentation):\*\*
  - Focus on clarity, consistent language, and cross-referencing rules instead of duplicating them.
  - Prohibit runtime logic; documents should describe, not execute.

- **Generated outputs (e.g., `out/**`, `dist/**`):**
  - Mark as read-only: never manually edit, always regenerate via build.

- **Tooling scripts (e.g., `bin/**`, `scripts/**`):**
  - Allow more operational logic but still enforce typing, documentation, and reuse of shared helpers.

For a new repo, define these scopes around its natural boundaries (frontend vs. backend, infra, docs, etc.) and have Copilot always run a “Path Guard” step before editing.

---

### 4. Decision Tree (Execution Flow)

**What this section solves:** Gives GPT a step-by-step flowchart so it always knows the next action and avoids skipping planning, tests, or logging.

Reusable structure:

1. **Path Guard:** Identify which path the change affects and load its scope-specific rules.
2. **Classify Request:** Decide whether the ask is a feature, bugfix, refactor, docs update, or analysis.
3. **Align with TODOs:** Ensure work maps to an existing task; if not, create or update `TODO.md` appropriately.
4. **Plan Minimal Steps:** Create a concise, high-value plan (not trivial steps) linked to those TODOs.
5. **Check Prerequisites:** Optionally run compile/test or static checks to ensure a healthy baseline.
6. **Resolve Ambiguity:** If requirements or constraints are unclear, ask the user and pause changes.
7. **Execute Focused Changes:** Implement the smallest safe increment respecting architecture and style.
8. **Verify:** Re-run tests/build/docs relevant to the change.
9. **Record:** Add or update changelog entries and reconcile TODO completion.
10. **Close or Escalate:** Only mark the task complete after verification and logging; otherwise document failures and request guidance.

When creating instructions for another project, keep this Decision Tree but swap in that repo’s concrete commands (e.g., `npm test`, `dotnet test`, `pytest`) and tracking files.

---

### 5. Communication Protocols for Copilot Chat

**What this section solves:** Standardizes how the model talks to the user while working, making behavior predictable and easy to follow.

Patterns to generalize:

- **Micro-updates:** Use short, periodic progress messages (especially around tool calls), tied to the active TODO or task.
- **Preambles:** Before running tools/commands, state briefly what will be done and why.
- **Result echo:** After each action, summarize success/failure and the next step in one line.
- **Avoid repetition:** Do not re-explain unchanged plans; focus on deltas.
- **Tone and formatting:** Use concise, professional language with lightweight headings where they improve scanability.

In other projects, keep the same ideas but adjust examples and command names. The goal is to define “how Copilot sounds” and how it narrates its work.

---

### 6. Critical Operating Rules

**What this section solves:** Encodes non-negotiable engineering constraints that shape all implementation work.

Generalizable themes:

- **Separation of concerns:** Clearly separate orchestration/coordination from worker logic and from user-facing formatting.
- **Data-driven configuration:** Avoid hardcoding categories, IDs, or business rules when they can live in config or metadata.
- **File-role clarity:** Define what is allowed in each directory (`types` vs. `shared` helpers vs. runtime code).
- **Platform patterns:** Capture mandatory patterns for the tech stack (e.g., ESM path resolution, dependency injection patterns, framework conventions).

For new repos, use this section to list “never do X” and “always do Y” policies that, if broken, would fundamentally violate the project’s architecture.

---

### 7. Default Behaviors, TODOs, and Changelog

**What this section solves:** Aligns Copilot’s work with the project’s planning and history tooling.

Key reusable ideas:

- **Planning files:** Clearly define what each planning/logging file is for (e.g., `TODO.md` for tasks, `CONTEXT-SESSION.md` for narrative notes, `CHANGELOG.md` for verified history).
- **Synchronization rule:** Whenever tasks are created or completed, `TODO.md` must be updated; whenever changes are made, `CHANGELOG.md` should record them with verification info.
- **Verification cadence:** Establish a “full pass” command sequence appropriate to the project (e.g., compile → test → docs build).

When writing instructions for other projects, explicitly name the equivalent files (project board, issue tracker, docs) so GPT knows where to read from and write to conceptually.

---

### 8. Development Best Practices

**What this section solves:** Provides code-level guidelines so generated changes match the project’s quality bar.

Transferable patterns:

- **Typed inputs and outputs:** Avoid `any`/untyped parameters where the stack supports types.
- **Documentation standards:** Define what doc comments must exist for new or modified code (e.g., function-level comments, module-level description).
- **Linting and checks:** Tie best practices to specific linting or formatting tools used in the repo.

For GPT 5.1 in a new project, encode whatever “house style” you want (naming conventions, error handling, logging patterns, test expectations) so Copilot naturally adheres to them.

---

### 9. Design Patterns & Architecture

**What this section solves:** Aligns the model with the intended architecture so its changes reinforce, not erode, design.

Common reusable patterns:

- **Orchestrator-first flows:** Central objects/components coordinate work; local components/agents remain simple and focused.
- **Metadata-driven UX:** Use config/metadata to drive user options instead of branching logic scattered in code.
- **Registries and composition:** Prefer registry-based lookups and composition over direct cross-imports that tangle modules.

In other repos, describe the main architecture choices (layers, services, modules, event buses, etc.) so Copilot routes new behavior into the right place.

---

### 10. Tools & Integrations

**What this section solves:** Teaches the model how to call project-specific tooling and external protocols correctly.

What to adapt:

- **Runtime patterns:** How to do standard tasks (e.g., resolve paths, start servers, talk to protocols/SDKs) in the chosen stack.
- **Generated artifacts:** Where generated configs live, and which scripts regenerate them.
- **Protocol rules:** Any constraints on APIs or transports (e.g., JSON-RPC shapes, REST conventions, event schemas).

For a different project, use this section to pin down “blessed” commands and integration patterns Copilot should use instead of inventing ad hoc commands.

---

### 11. Session Workflow

**What this section solves:** Describes the full lifecycle for a unit of work from Copilot’s perspective.

Reusable pattern:

1. **Start:** Read current TODOs and recent history; optionally run fast health checks.
2. **Implement:** Make focused changes following all architectural and scope rules.
3. **Verify:** Run the project’s standard verification commands.
4. **Record:** Update changelog and tasks to reflect what actually changed and was verified.

This can be copied almost verbatim into any project, replacing the concrete commands and file names.

---

### 12. Language, Style, and Pitfalls

**What this section solves:** Keeps wording, docs, and code style consistent, and preemptively steers Copilot away from common mistakes.

Patterns to reuse:

- **Language standard:** Pick one (e.g., American English) and enforce it in docs and comments.
- **Documentation nuances:** Note any formatting gotchas (e.g., how to structure examples, avoid certain sequences that break tooling).
- **Common pitfalls:** List the most damaging mistakes for your repo (e.g., editing generated files, bypassing orchestrators, hardcoding config) and what to do instead.

For new instructions, think of this as the “lint in prose” that tells GPT what to pay special attention to before and after edits.

---

### 13. Merge & Governance Changes

**What this section solves:** Ensures changes to the governance/instructions themselves are treated seriously and verified.

Transferable ideas:

- **Versioned governance:** Treat the instructions file like code: back it up, test relevant flows after edits, and document changes in the changelog.
- **Verification on change:** Require at least a minimal verification run whenever governance is updated.

In other projects, this section helps keep `copilot-instructions.md` trustworthy over time by enforcing a change process instead of ad hoc edits.

---

### 14. How to Use This Pattern in New Repos

When authoring a `copilot-instructions.md` for a new VS Code project, GPT‑5.1 should:

1. **Map the repo:** Identify key directories (code, tests, docs, build artifacts, scripts) and any existing planning/logging files.
2. **Instantiate sections:** Create sections analogous to the ones summarized here (Core Principles, Scope Rules, Decision Tree, Communication, Operating Rules, Workflows, etc.), customized with that project’s commands, tools, and architecture.
3. **Define constraints:** Clearly state language, frameworks, file roles, and “never do X” policies.
4. **Specify workflows:** Encode how to plan, implement, verify, and record work using the project’s actual tooling.
5. **Align with humans:** Mirror the team’s preferred communication style, review process, and documentation standards.

This summary is meant to be a blueprint: GPT‑5.1 can use it to scaffold effective, project-specific Copilot instructions that feel consistent, enforce architecture, and keep work verifiable end-to-end.
