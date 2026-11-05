## Development Methodology — Spec-Driven Development (SDD)

This project uses Spec-Driven Development. All feature work follows the spec → plan → tasks → execute pipeline.

### Build & Test Commands
- Build: `npm run build` (runs `astro check`, `astro build` and the precache script)
- Fast build: `npm run build:fast`
- Type check: `npm run check`
- Test: `npm run test:plan` (validates the study plan data; there is no unit or E2E suite yet — setting one up is the first task of the first feature that adds logic)
- Smoke: `bash start.sh test` (needs Docker, spends real DeepSeek calls; run only when asked)

### Before implementing any feature:
1. Read `specs/[feature]/spec.md` to understand what to build and why
2. Read `specs/[feature]/plan.md` to understand the technical approach
3. Read `specs/[feature]/tasks.md` to find the current task
4. Read `specs/memory/constitution.md` for architectural principles

### While implementing:
- Follow the task list in strict order — don't skip ahead
- Write the test FIRST. Run it to confirm it fails. Then implement until it passes.
- Mark tasks `[~]` when starting, `[x]` when done — keep tasks.md in sync at all times
- At `[C]` (checkpoint) tasks: run the full test suite AND the build, audit task marks, check against spec acceptance criteria, and record results in progress.md before continuing

### Non-goals in the spec are hard boundaries
Do not implement anything listed under "Non-Goals" in a feature's spec.md, even if it seems like a small addition.

### When starting a new session
1. Read `specs/[feature]/progress.md` to understand where the previous session left off
2. Run the full test suite and build to verify the current state matches the last checkpoint
3. Pick up from the first incomplete task in tasks.md

## Git

Applies the global "Git Workflow" rules. Project-specific values:
- **Language**: commit messages, branch names and PR titles/descriptions in **English** (Conventional Commits). Specs and docs stay in Spanish.
- **Main branch**: `master` — pushing to it deploys production (Netlify). Never push or merge to `master` without the owner's explicit OK.
- **Current work branch**: `redesign/ui` (backend Laravel, harness and redesign). New feature branches start from it until it is merged.
- **Before committing**: `npm test`, `npm run test:plan` and `npm run check`; once `backend/` exists, also its PHPUnit suite inside Docker.
- **Scopes**: `api`, `auth`, `quota`, `progress`, `library`, `ai`, `harness`, `learner`, `ui`, `plan`, `content`, `db`, `docker`, `specs`.
