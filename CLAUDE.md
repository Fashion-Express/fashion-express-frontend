# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

The OrgMS console for Fashion Express: a Next.js 16 App Router front end for the
**NestJS + PostgreSQL API in `../fashion-express-backend`**. This repo holds no
business logic. Every rule about money, stock and permissions lives in that
backend — most of it in database constraints — and this app's job is to present
those rules and pass their refusals back to the user readably.

`../fashion-express-backend/REQUIREMENTS.MD` and `DB_DESIGN.MD` are the
authoritative spec, and `../fashion-express-backend/api/*.md` documents one file
per entity with responses captured from a live server. Comments here cite the
rule ids those files use (`BR-29`, `FR-02.6.1`, `NFR-01`); when a comment names
a rule, that rule is written out in the backend and is worth reading before
changing the code around it.

> `README.md` is still the stock `create-next-app` text and is wrong about the
> port. Ignore it.

## Commands

```bash
npm run dev          # :5173 — NOT :3000, see Ports
npm run build
npm run lint         # eslint
npm run typecheck    # next typegen && tsc --noEmit
```

There is **no test suite in this repo.** The tests are the backend's
(`npm run test:db` there, 228 tests against a real PostgreSQL). Verification
here means running the app against the live API and walking the flow.

Nothing works without the backend, so bringing it up is part of developing here:

```bash
cd ../fashion-express-backend
./scripts/dev-postgres.sh start   # throwaway cluster on :55432, no sudo
cp .env.example .env              # set BETTER_AUTH_SECRET, point DATABASE_URL at :55432
npm run migration:run
npm run start:dev                 # :3000
```

There is no default login; `api/users.md` has the snippet that creates the first
account (a shop must exist first).

`next typegen` regenerates `PageProps`/`LayoutProps`. Run it after adding a
route or `tsc` will not know the new path.

## Ports

The backend owns **:3000**. This app runs on **:5173**, which is already in the
backend's default `TRUSTED_ORIGINS`, so no backend change is needed. Both
`dev` and `start` pin the port; do not remove the flag.

`.env.local`:

- `API_BASE_URL` — the API root. **Deliberately not `NEXT_PUBLIC_`**: the
  browser never calls the API directly.
- `APP_ORIGIN` — sent as `Origin` on `/api/auth/*` calls, and must be in
  `TRUSTED_ORIGINS`.

## The architecture, and why it has to be this one

**Everything talks to the API from the Next.js server. The browser never does.**

That is forced by the backend, not a preference: authentication is an HttpOnly
`better-auth.session_token` cookie with no bearer-token equivalent, so browser
JavaScript cannot read or attach it. `lib/auth/session.ts` signs in against
better-auth, reads the upstream `Set-Cookie`, and **re-issues it on this
origin**; `lib/api/client.ts` forwards it on every call. Consequences worth
knowing:

- CORS never enters the picture — it constrains browsers, not server-to-server
  requests.
- `Origin` is sent on `/api/auth/*` only. better-auth guards its own routes with
  an origin check that fires once a cookie exists; Nest's routes never want the
  header. A `403 MISSING_OR_NULL_ORIGIN` means `APP_ORIGIN` is not trusted.
- Binary downloads (exports, invoices, attachments) cannot be plain links to the
  API. They go through `app/api/download/[...path]/route.ts`, which attaches the
  cookie and streams the response back.
- `proxy.ts` (Next 16's rename of `middleware.ts`) only checks that a cookie
  *exists*. The security boundary is `requireSession()` in
  `app/(console)/layout.tsx`, which asks the API.

## Four rules that shape every file

**1. Money and quantities are decimal strings, end to end.** The API returns
`"45000.50"`, never a JSON number, because NFR-01 forbids floating point near
money. IDs are strings for the same class of reason (64-bit integers). Use
`lib/format/money.ts` — `toDecimal`, `sum`, `isPositive`, `isZero` — and never
`parseFloat`. `Number()` appears only inside `formatMoney` at the `Intl`
boundary, and on genuine counts.

**2. Dates render in Asia/Dhaka** (NFR-05), via `lib/format/date.ts`. The API's
`finalized_today` is a Dhaka day; formatting in the viewer's zone puts sales on
the wrong date for part of every day.

**3. Reads are snake_case, writes are camelCase.** `GET /customers` returns
`status_code`; `POST /customers` takes `statusCode`. This is *not* normalised
away — a recursive case-transformer would hide the difference and mangle a field
one day. The two shapes are typed separately in `lib/api/*.ts` and mapped
explicitly.

**4. `server-only` modules cannot be imported by client components.** Anything
in `lib/api/` that calls `apiFetch` imports `server-only`; a `"use client"` file
importing a *value* from one is a build error (type-only imports are fine, since
they erase). That is why client-safe constants live apart from their fetchers:
`reference-options.ts` beside `reference.ts`, `attachments.ts` beside
`bill-claims.ts`, `theme/tokens.ts` beside `theme/theme.ts`. Follow that split
rather than relaxing it.

## Verify request shapes against the DTOs, not the docs

The `api/*.md` curl examples show the common case and omit optional fields. The
authoritative shape is `../fashion-express-backend/src/modules/*/dto.ts`, and
the API runs `forbidNonWhitelisted`, so an extra or misnamed property is a 400
rather than an ignore. Several bugs came from guessing: sale lines take `boxes`
not `boxQuantity`, a sale's first payment is a **nested** `initialPayment`
object, sale payments take `notes` not `details`.

Read shapes deserve the same check — `GET /sales/:id` does **not** embed its
items or payments (they are separate routes, each re-applying BR-01's scope, and
`getSale` composes all three), and `/inventory/options` returns a richer row than
the other `/options` endpoints.

## Adding a module

Every module follows the same five pieces; copy Shops or Customers.

1. **`lib/api/<module>.ts`** — types + thin functions over `apiFetch`. Document
   the rule each endpoint enforces.
2. **`app/(console)/<module>/actions.ts`** — `"use server"`. Each action
   re-checks `requireSession()` and `can()`, because **a Server Action is
   reachable by direct POST**, not only through the button that renders it.
   Validate with zod, read form values through `lib/form.ts`.
3. **Page** — a Server Component that fetches and renders.
4. **Form/dialog** — `"use client"`, `useActionState`, errors via `<Field>`.
5. Add the route to `components/shell/nav.ts` (both `NAV` and `IMPLEMENTED`).

Details that bite:

- **`FormData.get` returns `null` for a field the form did not render**, and
  zod's `.optional()` rejects `null`. Always read through `text()` / `required()`
  in `lib/form.ts` — a raw `.get()` produces an error attached to a field that
  has no input, which renders nowhere and looks like a silent failure.
- **`redirect()` throws.** Call it *outside* the `try`, or the catch swallows the
  navigation and reports it as a failure.
- Actions that stay on the page call `refresh()` from `next/cache` and return
  `{ ok: true }`. The `ok` marker exists because the initial state and a success
  are otherwise indistinguishable — dialogs use it to close themselves.
- **Prefer uncontrolled `<select>`/inputs in forms.** A controlled value can
  drift from the DOM across a re-render; uncontrolled means what the user sees
  selected is what gets submitted.
- Errors are normalised once in `lib/api/errors.ts`: 400 arrives as
  `message: string[]` and is split per field; 409/422 carry a `constraint` name
  mapped onto a field where one identifies it. **Pass the API's message through
  verbatim** — those sentences are written for the user and name the alternative
  (BR-48's delete refusal, BR-31's overpayment).

## Permissions are presentation only

`can()` / `isManager()` in `lib/auth/session.ts` decide what to *draw*. The
server enforces the same rules on every route regardless, and a superuser
short-circuits every check, matching the backend. Two consequences:

- Hiding a button is never a substitute for the check inside the action.
- A record outside the caller's scope answers **404, not 403** (BR-01 on sales),
  so `lib/api/guard.ts`'s `forbidden()` renders `notFound()` — the existence of
  a record is itself not leaked.

## Design system

Tokens in `app/globals.css` come from `OrgMS UI Mockups.html` (an untracked
bundled design canvas at the repo root). Colours are CSS variables so the
runtime accent and light/dark controls repaint without a rebuild; the palette is
defined on bare `:root`, then again under `prefers-color-scheme` and
`[data-theme]` so an explicit choice wins in both directions.

**IBM Plex Mono is load-bearing, not decoration** — every amount, quantity, date,
ID and column label is monospaced so figures line up down a column. Use the
`mono` prop on `<Td>` and the `.tabular` class.

Two deliberate departures from the mockup: tables are real `<table>` elements
(the mockup draws grids of `<span>`s, which no screen reader can read as rows),
and the fixed 1440px artboards are responsive here — the sidebar becomes a
drawer below `lg`, and wide tables scroll inside their own container.

The accent is stored per browser in a cookie, **not** org-wide as the mockup's
Settings screen claims: `business_settings` has no theme field. Keep theme reads
and writes behind `lib/theme/theme.ts` so a server-persisted value is a one-file
change.

## Next.js 16 specifics

Beyond the `AGENTS.md` warning above, the ones that actually come up here:
`params`/`searchParams`/`cookies()`/`headers()` are all async; `middleware.ts` is
`proxy.ts` (Node runtime only); Turbopack is the default; `revalidateTag` now
needs a `cacheLife` argument — but nothing here is cached, since every response
is per-user and authenticated, so `refresh()` and `redirect()` cover mutations.
Do **not** enable `cacheComponents`.
