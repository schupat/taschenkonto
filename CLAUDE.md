# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KidsVault is an open-source family banking web app. Parents manage virtual "bank accounts" for children (allowance, chores, savings goals). Kids see their balance in a retro CRT terminal kiosk. **No real money is handled** — only numbers representing what parents track offline.

## Tech Stack

- **Framework:** Next.js (App Router, TypeScript)
- **UI:** React + Tailwind CSS
- **Database:** PostgreSQL with Prisma ORM
- **Auth:** Auth.js/NextAuth (email-based for parents, PIN for kids)
- **Validation:** Zod schemas for all request/response
- **i18n:** German (default) + English
- **Background Jobs:** HTTP cron hitting `/api/cron/allowance`

## Common Commands

```bash
npm install              # Install dependencies
npm run dev              # Start dev server
npm run build            # Production build
npm run lint             # Lint
npx prisma generate      # Generate Prisma client after schema changes
npx prisma migrate dev   # Run migrations in dev
npx prisma db seed       # Seed demo data (demo family + children)
npx prisma studio        # Visual DB browser
```

## Architecture

### Route Groups

```
app/
  (marketing)/     # Public landing page
  (app)/           # Authenticated parent UI (dashboard, transactions, chores, allowance rules)
  (kiosk)/         # Child-facing kiosk with CRT terminal design, PIN auth
  api/             # API routes
```

### Key Patterns

- **Saldo is always computed** from `SUM(transactions)`, never stored redundantly.
- **Amounts are integers in smallest currency unit** (e.g. cents). Never use floats for money.
- **Services layer** separates business logic from API handlers and UI. Structure: `lib/services/` for use-cases, API routes as thin controllers, UI components for presentation only.
- **Adapter pattern** for swappable externals (mail provider, DB URL, etc.).
- **Allowance cron must be idempotent** — repeated calls for the same period must not double-book. Use `lastRunAt`/`nextRunAt` fields.

### Domain Model (Prisma)

Core entities: `User` (parent) → `Family` → `ChildAccount` → `Transaction`, `AllowanceRule`, `ChoreAssignment`, `SavingGoal`. Family also owns `Chore` definitions. `ChoreCompletion` links assignment to approval and resulting transaction.

Transaction types: `DEPOSIT`, `WITHDRAWAL`, `ADJUSTMENT`, `ALLOWANCE`, `CHORE_REWARD`.
Transaction origins: `MANUAL`, `ALLOWANCE_RULE`, `CHORE_COMPLETION`.

### Two Distinct UIs

**Parent UI:** Modern, neutral palette, sans-serif font (Inter/system), light panels. Components: `AppShell`, `Card`, `ChildCard`, `TransactionTable`, form elements.

**Kiosk UI:** Near-black background, glowing green monospace text, CRT scanline effects (toggleable). Components: `TerminalScreen`, `BalanceDisplay` (animated count-up/down), `AsciiProgressBar`, `TerminalLog`, `TerminalButtonRow`. Optimized for tablet portrait. Uses polling or SSE for near-realtime updates.

### Theme System

Central Tailwind config with tokens:
- Color tokens: `color.bg.app`, `color.text.primary`, `kiosk.color.bg`, `kiosk.color.text`
- Typography tokens: `font.family.base`, `font.family.mono`, sizes
- Spacing: 4pt grid

### Security Notes

- Parent passwords and child PINs are hashed (bcrypt or similar).
- All `(app)` routes require parent auth; `(kiosk)` routes require child PIN auth.
- Cron endpoints must be secured (secret header or similar).
- Auth/authorization checks on every API route — parents can only access their own family's data.

## Workflow Orchestration

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately - don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes - don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests - then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.
