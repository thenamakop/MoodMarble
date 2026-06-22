# Week 7 Admin Boundary

## Purpose

This document defines the minimum safe admin access boundary before any Week 7 admin routes or screens are implemented.

The source of truth remains:

- `MoodMarble_Project_Specification.docx`

If any repository note conflicts with the `.docx`, the `.docx` wins.

## Scope of this document

This task defines:

- the smallest safe admin authorization shape for the current repository
- the admin-only backend route family
- the admin-only mobile route family
- the separation rules between admin, member, and manager surfaces

This task does not add:

- email login
- password login
- user profiles
- admin UI implementation
- onboarding changes
- anonymous session changes
- mood submission changes
- local history changes
- manager dashboard changes
- notifications or settings changes
- any identity expansion beyond the minimum admin gate

## Current repository baseline

The verified repository already has two distinct access surfaces:

- anonymous member access for onboarding, member home, history, and settings
- manager access for dashboard routes protected by a manager JWT

There is no implemented admin access boundary yet.

The minimum safe Week 7 addition is a third isolated boundary for admin-only work. It must not reuse the anonymous member session and it must not overlap with manager dashboard authorization.

## Admin authorization boundary

All backend `/admin/*` routes must require an admin JWT.

The minimum safe admin JWT payload is:

```json
{
  "workspace_id": "ws_123",
  "role": "admin"
}
```

The admin JWT must be:

- separate from the anonymous device JWT
- separate from the manager JWT
- scoped to exactly one workspace
- limited to the existing `admin` role only
- valid for `30 days` to stay aligned with the current JWT lifetime rule

This payload deliberately does not add:

- email
- name
- profile data
- device identifiers
- a new account model
- team scope by default

Workspace scope is the smallest safe boundary because the Week 7 admin responsibilities are workspace-level:

- workspace creation
- team management
- join code generation and copying
- anonymised CSV export

## Admin-only backend routes

The admin-only backend route family is:

- `POST /admin/team`
- `GET /admin/workspace/:id/export`

The same boundary also applies to the minimum future route wiring needed for:

- workspace creation
- join code generation or regeneration

Protection rules:

- `401 Unauthorized` when the bearer token is missing, invalid, expired, or not an admin token
- `403 Forbidden` when a valid admin token is used against a different workspace than the one named by the route or request
- member device JWTs and manager JWTs must never satisfy an admin route guard

## Admin-only mobile routes

The admin panel must be isolated under a dedicated admin route tree:

- `/admin`
- `/admin/workspace`
- `/admin/team`
- `/admin/export`

These routes exist as the reserved Week 7 admin surface. They are intentionally separate from:

- `/`
- `/history`
- `/settings`
- `/manager`

The mobile routing rules are:

- anonymous member route guards must redirect admin paths back to `/`
- manager route guards must redirect admin paths back to `/manager`
- future admin route guards must redirect non-admin paths back to `/admin`
- admin screens must not be mounted inside the member home handoff in `src/app/index.tsx`

## Access separation rules

What members can access:

- onboarding
- anonymous member home
- personal history
- local settings

What managers can access:

- dashboard routes and dashboard data allowed by the manager JWT boundary

What admins can access:

- admin team management
- workspace setup
- join code operations
- CSV export

What must remain inaccessible across boundaries:

- members must not reach `/manager` or `/admin`
- managers must not satisfy `/admin/*` backend guards with a manager JWT
- admins must not rely on the member anonymous session model for authorization
- admin work must not alter the existing member or manager surfaces unless a defect forces the smallest safe fix

## Implementation rule for the rest of Week 7

All remaining Week 7 admin work should build on these boundary decisions:

- reuse shared Zod contracts for the admin JWT payload
- reuse the existing backend bearer-token verification pattern
- keep admin entry separate from member and manager flows
- keep authorization workspace-scoped unless the specification forces a narrower rule
- do not introduce any new identity system while implementing admin responsibilities
