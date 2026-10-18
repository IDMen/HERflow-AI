# HERflow AI - HANDOFF DOCUMENTATION

This document is intended to help any AI model continue development of this project seamlessly.

## Current Architecture

### Monorepo Structure
- **Root**: npm workspaces with `frontend/`, `backend/`
- **Frontend**: Angular 20 standalone components, signals for state management, Zone.js, SCSS design system
- **Backend**: Express/TypeScript REST API with MongoDB/Mongoose
- **Scheduler**: Python OR-Tools for optimization with deterministic fallback

### Tech Stack
- **Frontend**: Angular 20, RxJS, Chart.js, lucide-angular
- **Backend**: Node/Express, TypeScript, Mongoose, Zod validation, JWT auth, bcrypt
- **Database**: MongoDB 7+
- **AI**: Google Gemini API (gemini-3.8-flash)
- **Scheduling**: OR-Tools 9.10+ (Python) with JS deterministic fallback

## Completed Features (Verified)

- âœ… Monorepo setup with workspaces
- âœ… Authentication: register/login/logout with JWT, token versioning, rate limiting
- âœ… User management, preferences, onboarding
- âœ… Four-mission onboarding (Know Yourself, Cycle, Build Future, AI Planner)
- âœ… Project/Task/Milestone CRUD with proper relationships
- âœ… Gemini AI project decomposition with caching, token tracking, rate limits
- âœ… Automatic replan on state changes (projects, tasks, deadlines, cycle, energy, availability)
- âœ… Scheduling engine with OR-Tools solver + deterministic fallback
- âœ… Calendar with day/week/month views, locked commitments preserved
- âœ… Dashboard with signal-backed reactivity, loading states, error handling
- âœ… Analytics with energy trend charts
- âœ… Settings with cycle management (encrypted), low-capacity days
- âœ… Encryption for sensitive cycle data (AES-256-GCM)
- âœ… Responsive design (mobile/tablet/desktop)
- âœ… Timeout handling, error boundaries, request cancellation

## Incomplete Features

None critical. Known non-blocking items:
- â˜ Full French i18n coverage (partial present)
- â˜ Push notifications
- â˜ Timezone edge cases (basic UTC/local handling exists)
- â˜ Docker build not verified in current environment

## Known Bugs

- None critical. All builds/tests pass. Reactivity issue (requiring click to show data) has been fixed with signal-based state.

## Last Verified Working State

- **Builds**: `npm run build` - passes (both frontend and backend)
- **TypeScript**: `tsc --noEmit` - passes for frontend and backend
- **Tests**: 8/8 tests passing (scheduling, services, reactivity)
- **Flow check**: `node scripts/check-flow.mjs` - passes (3 projects, 20 tasks, redistribution works)
- **Reactivity**: DOM checks pass at multiple breakpoints without user interaction
- **Gemini**: Integration configured with caching and fallbacks

## Next Recommended Action

**No immediate critical work needed.** The project is in a completed/verified state per the original requirements. If continuing development, focus on:
1. Browser E2E testing in a full browser environment (headless restricted here)
2. Enhance French translations for full coverage
3. Implement push notifications if desired
4. Address timezone edge cases based on user feedback

## Start Commands

### With Docker (recommended if available)
```bash
docker compose up --build
# Frontend: http://localhost:4200, API: http://localhost:3000/api
```

### Without Docker
Need 3 terminals:
```bash
# Terminal 1: MongoDB
npm run dev:mongo
# or run mongod directly if Windows blocks it

# Terminal 2: Backend API
npm run start -w backend

# Terminal 3: Frontend (serves production build)
npm run serve:local
# Frontend: http://localhost:4200
```

Development mode (with hot reload):
```bash
npm run dev  # runs both backend and frontend concurrently
```

### Setup First Time
```bash
cp .env.example .env  # Edit with JWT_SECRET (32+ chars), SENSITIVE_DATA_KEY (64 hex)
npm install
python -m pip install -r scheduler/requirements.txt
```

## Testing & Verification
```bash
npm test                  # Run all tests
npm run build             # Build all
node scripts/check-flow.mjs
node scripts/check-reactivity.mjs /dashboard 320
```

## How to Resume Development

1. **Understand state**: Read PROGRESS.md and HANDOFF.md
2. **Check Git**: Not a git repo currently (`.git` may exist but not initialized? Check: `git status`)
3. **Environment**: Ensure .env is configured properly
4. **Database**: MongoDB must be running on 127.0.0.1:27017
5. **Preservation**: Never delete existing code, follow existing patterns, use signals in Angular
6. **Critical rule**: Verify before claiming functionality works

## Architecture Notes

- **Cycle data**: Encrypted with AES-256-GCM, never sent to Gemini
- **Replan triggers**: All state changes call replan() on backend to auto-update schedule
- **Completed tasks/past records/locked events**: Preserved during recalculation
- **AI fallback**: Deterministic when Gemini unavailable/over limit/timeout
- **Signal state**: Frontend uses Angular signals + OnPush-compatible patterns

## Contact/Reference
See README.md and PROGRESS.md for additional details.
## Continuation status (2026-10-18)
- No `.git` directory is present in this workspace, so repository status/commit history are unavailable.
- `backend/src/scheduling.ts` now persists a success notice even if no items moved (states calendar unchanged), adds a warning count for infeasible plans, and persists a failure notice when the replan function throws. This patch has not yet been built or tested.
- Immediate next step: implement the missing frontend surface for viewing stored notification comparisons (moved tasks, old/new dates, workload and warnings/conflicts). Then run `npm run build`, `npm test`, and `node scripts/check-flow.mjs`. Current Node 20 launch fails with EPERM while resolving `C:\Users\elbootic.com`; resolve the execution environment before treating the current changes as verified.

## Localization continuation (2026-10-18)
- Root cause of mojibake: Angular source literals and `fr.json` contained already-corrupted text; `frontend/src/index.html` correctly declares UTF-8. No database text was modified.
- Added centralized `en.json`, `fr.json`, and `tn.json`, instant header/settings selectors, frontend local persistence, onboarding language preference, and backend preference enum support for `tn`.
- Common navigation and primary headings/actions use translated keys; full localization remains incomplete in many view strings (notably auth, onboarding, analytics, settings and calendar/project form copy). Localized date/number formatting is also still outstanding.
- Verified frontend/backend TypeScript and Angular production compilation with `--optimization=false`; source scan found no known mojibake codepoints; `scripts/check-reactivity.mjs /dashboard 1440` passes. Vitest cannot launch because the environment denies path lookup with `EPERM: lstat 'C:\Users\elbootic.com'`.
- Next: finish binding remaining interface copy to dictionaries, localize date/number formatting, and test switching all three languages in a browser and in Vitest.
- Lili wellness companion added in `frontend/src/app/lili-companion.component.ts`, mounted in `app.component.ts`. Tips use the selected language and only use cycle context when the account has privacy consent; actual last-period date and period duration are used, with regular-cycle estimate only for a brief pre-period tip. Energy tips require an actual low-capacity check-in. The mascot hides on login, registration, onboarding, and settings. `liliEnabled`/`liliMuted` persist via `PATCH /api/preferences/wellness` without invoking replanning. Reduced-motion CSS and 320/768/1440px reactivity checks pass. Build/typechecks pass after integration.
