HERflow AI
==========
Project planning with optional AI-assisted task breakdown and energy-aware
scheduling.

1. PROBLEM EXPLANATION
----------------------
People often manage school, work, and personal projects across separate tools.
Large goals can be difficult to break into manageable steps, deadlines can be
hard to balance with fixed commitments, and plans can become unrealistic when
time or energy changes. Basic task lists track work but may not help users turn
a large project into smaller tasks or plan around their available capacity.

HERflow brings projects, milestones, tasks, deadlines, commitments, availability,
and daily capacity into one place. It helps users turn project goals into
actionable work and plan that work around their time. HERflow is a productivity
and well-being tool, not a medical diagnostic service.

2. SOLUTION OVERVIEW
--------------------
HERflow is a mobile-first web application for project planning and scheduling.
Users can:

  - Register and complete onboarding.
  - Create projects with deadlines, priority, and estimated effort.
  - Organize projects into milestones and tasks.
  - Request a proposed project breakdown, review it, and approve tasks.
  - Set weekly availability, preferred work or study hours, and commitments.
  - Record daily capacity and update task progress.
  - View and recalculate a schedule based on tasks, deadlines, availability,
    commitments, and self-reported capacity.
  - Review notifications and progress analytics.
  - Export or delete account data.

The scheduler considers work duration, deadlines, dependencies, availability,
locked commitments, and capacity. It can use the optional Python OR-Tools
scheduler; a deterministic backend fallback is available when OR-Tools is
missing. Calendar slots use UTC in this version, so check local times when
moving events between timezones.

3. AI INTEGRATION EXPLANATION
-----------------------------
The optional AI integration uses Google's Gemini API to suggest a structured
breakdown of a project into milestones and tasks. Users review the proposal
before approving it, so generated tasks are not silently added to a schedule.

Integration flow:

  1. The browser sends the project request to the HERflow backend.
  2. The backend checks its cache and per-user daily request limit.
  3. If GEMINI_API_KEY is configured, the backend sends a bounded request to
     the configured Gemini model.
  4. The backend validates and caches a successful result and records token
     usage.
  5. The proposed breakdown is returned for review and approval.

The Gemini API key stays in the backend environment and is never sent to the
browser. The backend applies an output token limit, request timeout, and daily
per-user cap. Cycle data is not sent to Gemini. If the key is missing or a
request fails, HERflow provides a local breakdown for review.

To enable Gemini, set GEMINI_API_KEY in the root .env file and restart the
backend. GEMINI_MODEL, GEMINI_MAX_OUTPUT_TOKENS, GEMINI_REQUEST_TIMEOUT_MS, and
GEMINI_DAILY_REQUEST_LIMIT configure the model and request bounds.

4. HOW TO RUN THE PROJECT
-------------------------
Requirements:

  - Node.js 22 or newer
  - npm 10 or newer
  - MongoDB 7 or Docker with Docker Compose
  - Python 3.10 or newer for optional OR-Tools scheduling

Initial setup (PowerShell, from the repository root):

  1. Create the local environment file:

       Copy-Item .env.example .env

  2. Edit .env. Set JWT_SECRET to a random secret at least 32 characters long.
     Set SENSITIVE_DATA_KEY to exactly 64 hexadecimal characters. Generate a
     random 32-byte hex value with this command:

       node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"

     Run it twice to create separate values for the two secrets. Keep .env
     private and do not commit it.

  3. Install JavaScript dependencies:

       npm install

  4. Optional: install Python scheduler dependencies:

       python -m pip install -r scheduler/requirements.txt

     OR-Tools is optional because the backend has a deterministic fallback.

Option A: Run with Docker Compose

Make sure Docker is running and .env is configured. From the repository root:

  docker compose up --build

This starts MongoDB, the backend API, and the frontend. Open
http://localhost:4200.

Option B: Run locally with an installed MongoDB

Start MongoDB first. Confirm MONGODB_URI in .env points to it. Then run this
from the repository root:

  npm run dev

This starts the backend and frontend for development. Open the web app at
http://localhost:4200. The API is at http://localhost:3000/api, and the health
endpoint is http://localhost:3000/api/health.

Option C: Run locally with the included MongoDB helper

The helper downloads MongoDB 7 into .cache/mongodb and stores database files in
.data/mongo. Open two terminals at the repository root.

Terminal 1:

  npm run dev:mongo

Terminal 2:

  npm run dev

Then open http://localhost:4200.

If Windows prevents Node from launching MongoDB, start the downloaded binary
directly in a terminal at the repository root:

  .\.cache\mongodb\mongod-x64-win32-7.0.15.exe --dbpath .\.data\mongo --port 27017 --bind_ip 127.0.0.1 --setParameter diagnosticDataCollectionEnabled=false --quiet

Leave MongoDB running and start the app in another terminal with npm run dev.

Option D: Serve a production build locally

With MongoDB running and .env configured, build from the repository root:

  npm run build

Then start the services in separate terminals:

  npm run start -w backend

  npm run serve:local

Open http://localhost:4200. The local frontend server serves the production
build and proxies /api requests to the backend on port 3000. Rebuild after
changing source code.

First use:

Register an account in the web app and complete onboarding. Enter projects,
deadlines, availability, and commitments. Add tasks yourself or request an AI
breakdown, then review it before approval. Update task status and daily capacity
as plans change, and recalculate the schedule when needed.

Optional sample data:

  npm run seed -w backend

The seed script may create a demo account with these local development
credentials:

  Email:    demo@herflow.local
  Password: DemoPassword123!

Change this password or delete the account before exposing the app to others.

5. TECH STACK
-------------
Frontend:
  - Angular 20 with standalone views and lazy routes
  - TypeScript
  - SCSS
  - RxJS
  - Chart.js for analytics charts
  - Lucide Angular icons

Backend:
  - Node.js 22+
  - TypeScript, run in development with tsx
  - Express 5 REST API
  - MongoDB 7 with Mongoose 8
  - JSON Web Tokens for authentication
  - bcryptjs for password hashing
  - Zod for request validation
  - Helmet, CORS, compression, and express-rate-limit for API protections
  - Google GenAI SDK for optional Gemini project breakdown

Scheduling and local services:
  - Python 3.10+ and OR-Tools, optional
  - Deterministic backend scheduling fallback
  - Docker Compose for containerized services
  - Vitest for backend and frontend unit tests

6. ENVIRONMENT SETTINGS
-----------------------
The root .env file is based on .env.example. Common settings include:

  MONGODB_URI                  MongoDB connection string
  JWT_SECRET                   Token signing secret, 32+ characters
  SENSITIVE_DATA_KEY           Encryption key, 64 hexadecimal characters
  PORT                         Backend port (default 3000)
  CLIENT_ORIGIN                Allowed frontend origin
  GEMINI_API_KEY               Optional Gemini API key
  GEMINI_MODEL                 Gemini model name
  GEMINI_MAX_OUTPUT_TOKENS     Maximum generated output size
  GEMINI_REQUEST_TIMEOUT_MS    Gemini request timeout
  GEMINI_DAILY_REQUEST_LIMIT   Per-user daily AI request limit
  SCHEDULER_PYTHON             Python executable for scheduling support

Do not put private keys in frontend source code. Do not share or commit .env.
For public deployment, use unique production secrets, HTTPS, and a MongoDB
instance that is not publicly exposed without access controls.

7. USEFUL COMMANDS
------------------

  npm run dev               Start API and frontend in development
  npm run dev:mongo         Start the included MongoDB helper
  npm run build             Build backend and frontend
  npm run start -w backend  Start the built backend
  npm run serve:local       Serve the built frontend with API proxy
  npm run seed -w backend   Add sample projects
  npm test                  Run backend and frontend test suites

8. PROJECT STRUCTURE
--------------------

  backend/             Express API, data models, auth, Gemini, scheduling
  frontend/            Angular app, views, styles, browser assets
  scheduler/           Optional Python/OR-Tools scheduler
  scripts/             Local Mongo helper, local server, and project checks
  docker-compose.yml   MongoDB, backend, and frontend containers
  .env.example         Example configuration (copy to .env)
  README.md            Short setup documentation
  Readme.txt           This detailed project guide

9. TROUBLESHOOTING
------------------

MongoDB connection failed:
  Check that MongoDB is running, port 27017 is available, and MONGODB_URI
  points to the correct database.

The frontend cannot reach the API:
  Check that the backend is running on port 3000 and CLIENT_ORIGIN matches the
  frontend address. Check the backend terminal for errors.

A port is already in use:
  Stop the process using port 27017, 3000, or 4200, or update the relevant
  configuration and proxy settings consistently.

Authentication or encryption errors:
  Check JWT_SECRET is at least 32 characters and SENSITIVE_DATA_KEY is exactly
  64 hexadecimal characters. Restart the backend after changing .env.

Gemini breakdown is unavailable:
  Check GEMINI_API_KEY, the configured model, network access, and API account
  access. The local breakdown remains available when Gemini is disabled or a
  request fails.

OR-Tools is unavailable:
  Install scheduler/requirements.txt with the Python interpreter configured in
  SCHEDULER_PYTHON. The application can use its deterministic fallback.

10. PRIVACY AND PRODUCT LIMITS
-----------------------------
Cycle preferences require user consent and are encrypted before storage. Cycle
data is not sent to Gemini. Use the application's export and delete features
to manage account data. HERflow supports personal planning and well-being; it
does not diagnose or treat health conditions. Schedule times are stored in UTC
in this version and should be checked when working across timezones.
