# WEIN

WEIN helps people discover things to do and plan outings together. This pnpm
workspace contains a React 19 / TypeScript frontend built with Vite, Tailwind CSS,
and Radix UI; an Express planning API; PostgreSQL schemas using Drizzle; and
OpenAPI-generated clients and validators.

## Current state

- Discover includes Ticketmaster search, event details, prompt-based searches,
  budget/date/distance filters, and browser location preferences.
- Plans includes a real API-backed list with search/status filters, a Create Plan
  form, and linkable Plan Detail pages. Detail displays members, attendance,
  decisions, shared ideas, polls, and conversation returned by the existing API.
  These detail sections are read-only in this milestone.
- Live, other Create options, and profile/onboarding screens include prototype
  content.
- The separate planning API implements membership, messages, polls, decisions,
  attendance, media metadata, and memories. It needs `DATABASE_URL` and currently
  identifies callers through `X-User-Id`; production authentication remains work
  to do.
- Vercel discovery functions live in `artifacts/wein-discover/api`. The Vite
  development server serves those discovery routes through its middleware.

## Run locally

Use Node.js 22 or newer and pnpm 10.34.5. From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm --filter @workspace/wein-discover dev
```

Set `TICKETMASTER_API_KEY` in the server environment before starting the app.
For PowerShell:

```powershell
$env:TICKETMASTER_API_KEY = 'your-key'
pnpm --filter @workspace/wein-discover dev
```

Open `http://localhost:5173`. Without a provider key, live discovery returns a
clear configuration error rather than fabricated results. For Vercel, set the
same variable in the deployment environment. Keep keys out of browser code and
source control. Vite preview serves built frontend assets, not discovery API
middleware; use the development server or Vercel for API testing.

Windows x64 and Linux x64 build dependencies are enabled. Other native platforms
remain excluded by existing workspace overrides.

## Try Plans locally

After installing dependencies, run each command in its own terminal from the
repository root:

```sh
pnpm --filter @workspace/api-server dev:local
pnpm --filter @workspace/wein-discover dev
```

Open `http://localhost:5173/plans`. The API runs on `127.0.0.1:3001`, and Vite
proxies `/api/plans` to it. The Plan action in the Create menu also opens the form.
The embedded PostgreSQL database (PGlite) applies the checked-in schema migration
and persists data in `artifacts/api-server/.local/plans-db`, which Git ignores.
No database password or external account is needed. `PLANS_PORT` and
`WEIN_LOCAL_DB_PATH` override the local API port and data directory. Set Vite's
`PLANS_API_URL` if you change the port.

Plans use a browser-generated ID stored as `wein-plans-actor` in local storage
and send the API's existing `X-User-Id` header. Clearing browser storage creates
a new identity; existing plans remain in the database but will not appear for
that new identity. When storage is unavailable, identity lasts for the page
session. This is a development identity mechanism, not production authentication.
Public visibility is stored by the API; workspace access still requires membership.

## Plans deployment

Production continues to use the existing PostgreSQL API: configure `DATABASE_URL`
on the API server, provision its schema, build it, and start it with `PORT` set.
The local embedded database is used only by `dev:local` and tests.

For Vercel, set the server-side `PLANS_API_URL` to the Express API origin, without
an `/api` suffix. The new `/api/plans` and `/api/plans/:id` functions forward
requests to that origin and preserve API errors. Missing configuration returns
503. Alternatively, configure `VITE_PLANS_API_URL` at frontend build time for
direct browser requests to an API origin with appropriate CORS settings.
The example environment file is in `artifacts/wein-discover/.env.example`.

Replace the temporary actor header with verified authentication before exposing
private user plans publicly. This milestone does not deploy a production API or
change hosting settings.

## Checks

```sh
pnpm test
pnpm typecheck
pnpm build
```

Discovery and proxy tests use mocked upstream responses and require no API keys.
Plans UI tests cover creation, validation, duplicate submissions, retries,
navigation, search/status filters, identities, and inaccessible plans. API tests
run real HTTP requests against an isolated embedded PostgreSQL database and
check membership, visibility, status filters, error codes, and restart persistence.
All tests are included in `pnpm test` and TypeScript checking. Live Ticketmaster
availability still requires a separately configured integration environment.

Discovery requests validate numeric ranges, coordinate pairs, ISO timestamps,
price ranges, and supported sort modes. Provider requests time out after eight
seconds. Missing provider events return 404; provider failures return 502 and
missing configuration returns 503.

## Next milestones

Integrate authentication and enable invitations, messaging, and poll/decision
actions in the Plans UI. Replace remaining prototype content. Prompt date
interpretation currently uses server time;
user-timezone interpretation is still needed for geographically accurate dates.
