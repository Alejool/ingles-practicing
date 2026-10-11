# Development Constitution

These principles guide all technical decisions in this project. They're defaults, not dogma — a feature can override one by documenting the rationale in its plan.md.

## Principles

### 1. Test-First
Write tests before implementation code. If you can't write a test for something, you don't understand it well enough to build it.

### 2. Simplicity
Choose the simplest approach that satisfies the requirements. No framework, dependency or abstraction is added without a reason written in the plan.

### 3. Explicit Over Implicit
Make behavior visible and predictable: clear error messages over silent failures, named functions over clever one-liners.

### 4. Integration-First Testing
Prioritize tests that exercise real workflows. Unit tests are for logic that is complex on its own (scheduling, scoring, date math).

### 5. No Premature Abstraction
Write concrete code first. Extract only when the same pattern has appeared three times.

## Project-specific rules

### 6. Saved data is sacred
The shape and keys of what is already stored (localStorage blob, IndexedDB queue, database schema) do not change. New data goes in new, optional fields or new keys, and the app must keep working when they are absent.

### 7. Content is not rewritten
Existing study content in `src/data/` is not edited by feature work. New content is added alongside it.

### 8. Offline and account-free first
Every study feature works without a network and without an account. Server features are additions, never requirements.

### 9. Accessible by construction
New UI ships with its announcements (`aria-live`), focus handling, labels and keyboard operation. WCAG 2.1 AA is the floor.

### 10. Colors only from tokens
No hex or rgb values outside the token blocks at the top of `src/styles/global.css`. The orange accent is a fill, never text on a light surface.
