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

## Scope of This Document

This document covers the authentication model as of the post-Week-8 state
(admin login screen + manager join-code feature). It does not cover MFA,
password reset flows, or multi-admin support — none of which are implemented.
