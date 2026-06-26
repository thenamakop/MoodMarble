# Security — MoodMarble

## Authentication Model

Three distinct, non-interchangeable credential types are in use:

**Device JWT**: Issued when a member joins a workspace via the employee join code.
Carries `{ device_token, workspace_id }`. Grants mood submission and anonymous
history access. Verified by `verifyDeviceJwt()` in `src/auth/device-jwt.ts`.

**Manager JWT**: Issued when a manager redeems a one-time code via
`POST /auth/redeem-manager-code`. Carries `{ workspace_id, team_id, role: "manager" }`.
Grants read access to aggregate dashboard endpoints. Verified by `verifyManagerJwt()`
in `src/auth/manager-jwt.ts`.

**Admin JWT**: Issued via `POST /auth/login` (email + bcrypt password). Carries
`{ workspace_id, role: "admin" }`. Grants full admin API access. Verified by
`verifyAdminJwt()` in `src/auth/admin-jwt.ts`.

All three token types are signed with the same `JWT_SECRET`. Role-gated routes
validate the JWT role claim via Zod — a device JWT submitted to an admin route
fails schema validation and returns 401.

## Why There Is No Admin Join Code

Admin join codes do not exist. A single intercepted admin code would grant full
access to all workspace data, team configuration, CSV exports, and credential
management simultaneously. Admin authentication is email + bcrypt password only.

This is enforced at the API layer: `POST /auth/redeem-manager-code` only issues
JWTs with `role: "manager"`. No endpoint issues `role: "admin"` except
`POST /auth/login`. This constraint is annotated in `src/routes/auth.ts`.

## Manager Code Security Properties

- Generated with `crypto.randomBytes(6)` mapped to a 36-character A-Z0-9
  alphabet. Not `Math.random`.
- 6 characters: ~2.18 billion possible codes. Adding rate limiting on the
  redeem endpoint (as recommended below) makes brute-force impractical.
- One-time use: `used_at` is set on first successful redemption. Any subsequent
  attempt returns 404.
- Time-limited: default 7 days, maximum 30 days (configurable per code by admin).
- Revocable: admin can set `is_revoked = 1` at any time before use.
- All failure modes (unknown code, used, expired, revoked) return the identical
  response: `{ "message": "Invalid or expired manager code." }` — no state leaked.

Note for production: `POST /auth/redeem-manager-code` is not currently rate-limited.
Add per-IP rate limiting (matching the 5 requests / 15 minutes used on `/auth/login`)
before deploying to a public network.

## Admin Password Policy

- Minimum 12 characters enforced by `scripts/seed-admin.ts`.
- Stored as a bcrypt hash at saltRounds=12 in the `admin_credentials` table.
- Never logged, never returned in any API response.

## Timing-Attack Mitigation on Admin Login

`POST /auth/login` always calls `bcrypt.compare()` before returning, even when
the submitted email does not match any account. A pre-computed hash of a known
string (`DUMMY_HASH` in `src/routes/auth.ts`) is used as the comparison target
when no account is found. This ensures response time is identical for known and
unknown emails, preventing user enumeration by timing.

## Rate Limiting

`POST /auth/login` is rate-limited to 5 requests per IP per 15 minutes using an
in-memory map. The counter expires naturally after 15 minutes. No other endpoint
is rate-limited.

Note for production: the in-memory map resets on server restart. Replace with
Redis-backed rate limiting for multi-instance or high-availability deployments.

## URL-Param JWT Bootstrap Path

`apps/mobile/src/features/onboarding/session-boundary.ts` contains a code
path that accepts `workspace_id`, `team_id`, and `device_jwt` as URL query
parameters and boots an anonymous session from them.

**Current status:** this path is unused in production. No join-code or
onboarding flow currently injects a `device_jwt` into the home-route URL.
On native it is always a no-op (URL params are absent). It is retained for
forward compatibility only.

**Known exposure if the path were activated:**

- A `device_jwt` in a query string is visible in browser history, proxy/CDN
  access logs, and the HTTP `Referer` header sent to any third-party resource
  loaded on the destination page.
- `getAnonymousSessionFromParams` performs a client-side expiry check only;
  JWT signature verification happens server-side on every API request.
  A structurally valid but tampered token will pass this check and be
  rejected by the backend on first use.

**Existing mitigation:** `index.tsx` calls `scrubUrl()` immediately after
detecting a param-bootstrapped session, removing the token from the address
bar and the current browser history entry.

**Before activating this path in production:**

1. Deliver the link exclusively over HTTPS.
2. Issue short-lived tokens for this flow (recommended: ≤ 1 hour).
3. Add rate limiting on `POST /auth/redeem-manager-code` (see note above).

## Test-Fixtures Route and `NODE_ENV` Guard

`apps/backend/src/routes/test-fixtures.ts` registers a `POST /__test/reset`
endpoint that wipes and reseeds the database. It is used by E2E tests and
the local development seed script.

The route has a hard `NODE_ENV === "production"` guard that returns 403 in
production. **Do not remove or weaken this guard.** If the guard is bypassed
(e.g. by setting `NODE_ENV` to a non-"production" string in a prod deployment),
the endpoint would be publicly accessible and would allow any caller to delete
all workspace, team, member, and mood data.

Additional hardening recommendations for production deployments:

- Ensure `NODE_ENV=production` is set in the process environment.
- Restrict access to `/__test/*` paths at the load balancer / reverse proxy
  layer as a defence-in-depth measure.
- The route is registered unconditionally at app startup; if test routes must
  be completely absent from production, move registration behind a build-time
  flag rather than a runtime env check.

## Admin Export Privacy Boundary

The admin CSV export (`GET /admin/export`) intentionally omits `note_hash`.
Although SHA-256 is a one-way function, the source text is short free-form
input (≤ 120 characters) with low entropy; a rainbow table attack against
exported hashes is feasible. Omitting the hash from exports ensures raw-note
content cannot be recovered from exported data even if the export file is
leaked.

The `note_hash` column remains in the `mood_submissions` database table for
internal deduplication and is never exposed via any API response or export.

## Scope of This Document

This document covers the authentication model as of the post-Week-8 state
(admin login screen + manager join-code feature). It does not cover MFA,
password reset flows, or multi-admin support — none of which are implemented.
