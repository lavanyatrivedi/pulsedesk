# PulseDesk

An event-driven commodity intelligence dashboard that connects price action to market catalysts and sentiment.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/pulsedesk/src/` — React dashboard and visual theme
- `artifacts/api-server/src/routes/markets.ts` — market data and morning brief endpoints
- `lib/api-spec/openapi.yaml` — source of truth for the market API contract
- `lib/api-client-react/src/generated/` — generated React Query client

## Architecture decisions

- Market data is deterministic demo data so the dashboard is useful offline and has a stable first-load experience.
- The frontend uses generated OpenAPI hooks rather than hand-written fetchers.
- The market view is intentionally a single focused route; commodity selection drives the dependent price, event, and brief queries.

## Product

Users can switch between crude oil, gold, and natural gas; scan price history; inspect catalyst sentiment and realized five-day impact; and read a plain-English morning desk brief.

## User preferences

No additional preferences recorded.

## Gotchas

After changing the API contract, run `pnpm --filter @workspace/api-spec run codegen` before checking the frontend.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
