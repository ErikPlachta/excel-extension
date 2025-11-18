# Context Current

<!-- BEGIN:COPILOT-INSTRUCTIONS -->

## Copilot Instructions

### Core Instructions

- You do NOT track TODOs here. That is done in [TODO.md](TODO.md).
- You do NOT track overall project context here. That is done in [CONTEXT-SESSION.md](CONTEXT-SESSION.md).
- This document is ONLY for the CURRENT CONTEXT of the current chat session.
- Use this as a Sandbox for documenting details and notes about the current work.
- At the start of a new focus, purge all content between markers `<!-- BEGIN:CURRENT-CONTEXT-DETAILS -->` and `<!-- END:CURRENT-CONTEXT-DETAILS -->`.

## Understanding Session Context vs Current Focus vs Actionable Tasks

Task Management and Focus is managed by using 3 key files/documents with very precise rules and roles to prevent drift:

### 1. `SESSION-CONTEXT` = [CONTEXT-SESSION.md](CONTEXT-SESSION.md)

- High Level.
- Defines the overall context for the current branch.
- This is defined by an H2 in [TODO.md](TODO.md), and it encompasses all related tasks and subtasks.
- The current branch will be aligned to this.
- At the beginning of a new branch, the `## Current Focus` section in the file is updated with precise details about the branch focus.
  - User asks Copilot to review section in TODO, review full codebase, make sure file is up-to-date, and update Current Focus with required details based on it's understanding of our new focus.

### 2. `CURRENT-FOCUS` = [CONTEXT-CURRENT.md](CONTEXT-CURRENT.md)

- The Current Focus, this file, is a subset of the Session Context.
- It defines the specific current focus within the overall Session Context.
- It is more granular and specific.
- It is used to track the immediate focus of work.
- Each Current Focus in [CONTEXT-CURRENT.md](CONTEXT-CURRENT.md) should directly relate to a collection of TODOs in [TODO.md](TODO.md), under a category.
- A completed `Current Focus` looks like this:
  - `- [x] **Handle unreachable dev server / blank taskpane experience**` in [TODO.md](TODO.md#handle-unreachable-dev-server-blank-taskpane-experience).
  - It's technically not "current" because it's completed, but before it was checked `[x]` it was considered current.
  - So the current focus, then, is the next child-level list within the Session Context (header) that is not yet checked.
  - An active/current Current Focus example at time of writing this: `- [ ] **Improve Office.js Wrapper Logic**`
    - We know this because it's the next unchecked item in the list underneath the `SESSION-CONTEXT` H2 `## 11. Refine & Improve Excel Functionality`.

### 3. `ACTIONABLE-TASKS` = [TODO.md](TODO.md)

- TODO: Add notes here
- `ACTIONABLE-TASKS` = [TODO.md](TODO.md)
  - Our actionable tasks/todo and subtasks.
  - Each Current Focus in [CONTEXT-CURRENT.md](CONTEXT-CURRENT.md) should directly relate to a collection of TODOs in [TODO.md](TODO.md), under a category.
  - These are actionable steps, managed top-down, to be completed.
  - Example of Current Focus
    - Example: [11. Refine & Improve Excel Functionality](TODO.md#11-refine--improve-excel-functionality)

<!-- END:COPILOT-INSTRUCTIONS -->

<!-- BEGIN:CURRENT-FOCUS -->

## Current Focus

- [ ] TODO: Add current focus and remove this todo.

<!-- END:CURRENT-FOCUS -->
