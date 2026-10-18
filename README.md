# HERflow AI

Mobile-first project planning with optional energy-aware scheduling. HERflow is a productivity and well-being tool, not a medical diagnostic service.

## Requirements

- Node.js 22+, npm 10+
- MongoDB 7+ (or Docker)
- Python 3.10+; OR-Tools is optional locally because the deterministic scheduler is a fallback

## Local setup

From the repository root:

```powershell
Copy-Item .env.example .env
# Edit .env: set a random JWT_SECRET (32+ characters) and SENSITIVE_DATA_KEY (64 hex characters).
npm install
python -m pip install -r scheduler/requirements.txt
docker compose up -d mongo
npm run dev
```

Open **http://localhost:4200**. The API is at **http://localhost:3000/api**. For a complete containerized build, run `docker compose up --build`; this serves the frontend on the same URL.

### Local run without Docker

The included local MongoDB helper downloads a MongoDB 7 binary into `.cache/mongodb`. Run these in separate terminals after creating `.env`, installing dependencies, and building:

```powershell
npm run dev:mongo
npm run start -w backend
npm run serve:local
```

If Windows blocks Node from starting MongoDB, run the downloaded executable directly in the first terminal:

```powershell
& '.\.cache\mongodb\mongod-x64-win32-7.0.15.exe' --dbpath '.\.data\mongo' --port 27017 --bind_ip 127.0.0.1 --setParameter diagnosticDataCollectionEnabled=false --quiet
```

The local frontend server serves the production build and proxies `/api` to port 3000. Rebuild with `npm run build` after code changes. OR-Tools is installed into `.venv` locally and `.env` sets `SCHEDULER_PYTHON=../.venv/Scripts/python.exe` for Windows.

To create three sample projects in the database:

```powershell
npm run seed -w backend
```

Demo login: `demo@herflow.local` / `DemoPassword123!`. Change the password or delete this account before any public deployment.

## Gemini

Set `GEMINI_API_KEY` in `.env` to enable project decomposition using `gemini-3.8-flash`. The backend makes one bounded request per changed project, caches a successful result, records token usage, and enforces a daily per-user request cap. When the key is missing or the request fails, users receive a local breakdown to review. No cycle data is sent to Gemini. The API key is never sent to the browser.

## Checks

```powershell
npm test
npm run build
node scripts/check-flow.mjs
node scripts/check-gemini.mjs
node --experimental-default-type=module scripts/check-component-reactivity.mjs
node --experimental-default-type=module scripts/check-reactivity.mjs /dashboard 320
```

The end-to-end registration to scheduling flow needs a running MongoDB. Set your own database and Gemini credentials for live integration verification. Sensitive cycle preferences require consent and `SENSITIVE_DATA_KEY`; they are encrypted before storage. JWT signing requires `JWT_SECRET`.

## App structure

- `frontend/`: Angular standalone views, lazy routes, SCSS design system, English/French labels
- `backend/`: Express REST API, Mongoose data models, authentication, AI, analytics
- `scheduler/`: OR-Tools day allocation with deterministic backend fallback

The schedule can be recalculated from tasks, deadlines, availability, locked commitments, and self-reported capacity. The calendar uses UTC-based slots in this version; check your local time when moving events across timezones.
