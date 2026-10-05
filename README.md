# WEIN

WEIN helps people discover things to do and plan outings together. This pnpm
workspace contains a React 19 / TypeScript frontend built with Vite, Tailwind CSS,
and Radix UI; an Express planning API; PostgreSQL schemas using Drizzle; and
OpenAPI-generated clients and validators.

## Current state

- Discover includes Ticketmaster search, event details, prompt-based searches,
  budget/date/distance filters, and browser location preferences.
- Live, Create, Plans chats, and profile/onboarding screens include prototype
  content. Plans conversations are currently sample data, not connected to the
  planning API.
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

## Checks

```sh
pnpm test
pnpm typecheck
pnpm build
```

Discovery tests use mocked provider responses, require no API key or database,
and cover input validation, configuration/provider failures, timeouts, missing
events, filtering, limits, empty results, and sorting. Real provider availability
and database workflows require separately configured integration environments.

Discovery requests validate numeric ranges, coordinate pairs, ISO timestamps,
price ranges, and supported sort modes. Provider requests time out after eight
seconds. Missing provider events return 404; provider failures return 502 and
missing configuration returns 503.

## Next milestones

Connect Plans to the planning API after provisioning a development database and
integrating authentication. Replace remaining prototype content and validate
end-to-end planning flows. Prompt date interpretation currently uses server time;
user-timezone interpretation is still needed for geographically accurate dates.
