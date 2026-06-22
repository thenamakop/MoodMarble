# Week 7 Admin API Contract

## Purpose

This document defines the narrow backend API surface for Week 7 admin and export work before any admin UI is built.

The source of truth remains:

- `MoodMarble_Project_Specification.docx`

If any repository note conflicts with the `.docx`, the `.docx` wins.

## Scope of this document

This task defines:

- the exact Week 7 admin backend endpoints
- the auth rule for each endpoint
- the shared request and response contracts
- the privacy limits for every admin response

This task does not add:

- a general-purpose management API
- member-facing API changes
- manager dashboard API changes
- identity expansion
- raw-note or member-level export data

## Endpoint list

The Week 7 admin API surface is limited to these endpoints:

- `POST /admin/workspace`
- `GET /admin/workspace/:workspaceId/teams`
- `POST /admin/team`
- `PATCH /admin/team/:teamId`
- `GET /admin/workspace/:workspaceId/join-code`
- `POST /admin/workspace/:workspaceId/join-code`
- `GET /admin/workspace/:workspaceId/export`

No other admin endpoints are part of the Week 7 contract.

## Auth model

### Workspace bootstrap

`POST /admin/workspace` is the bootstrap endpoint. Because no workspace exists yet, it cannot use a workspace-scoped admin JWT.

It must require:

- header: `x-admin-bootstrap-secret`

This is the smallest safe bootstrap gate for workspace creation. It does not introduce an account model or a profile model.

### Workspace-scoped admin routes

Every other `/admin/*` route must require:

- `Authorization: Bearer <admin_jwt>`

The admin JWT remains workspace-scoped:

```json
{
  "workspace_id": "ws_123",
  "role": "admin"
}
```

Protection rules:

- `401 Unauthorized` for missing, invalid, expired, or wrong-role tokens
- `403 Forbidden` when the route workspace does not match the admin JWT workspace scope

Manager JWTs and member device JWTs must never satisfy admin route guards.

## Request and response contracts

### `POST /admin/workspace`

Purpose:

- create one workspace
- generate one active join code
- issue the first admin JWT for that workspace

Request body:

```json
{
  "name": "MoodMarble HQ"
}
```

Success response: `201`

```json
{
  "workspace": {
    "id": "ws_hq",
    "name": "MoodMarble HQ",
    "join_code": "ABC123"
  },
  "admin_jwt": "<token>"
}
```

Shared contracts:

- `AdminWorkspaceCreateRequestSchema`
- `AdminWorkspaceCreateResponseSchema`

### `GET /admin/workspace/:workspaceId/teams`

Purpose:

- list the current teams inside one workspace for the admin management flow

Success response: `200`

```json
{
  "teams": [
    {
      "id": "tm_product",
      "workspace_id": "ws_hq",
      "name": "Product"
    }
  ]
}
```

Shared contract:

- `AdminTeamListResponseSchema`

### `POST /admin/team`

Purpose:

- create one team inside the workspace from the admin JWT scope

Request body:

```json
{
  "name": "Product"
}
```

Success response: `201`

```json
{
  "team": {
    "id": "tm_product",
    "workspace_id": "ws_hq",
    "name": "Product"
  }
}
```

Shared contracts:

- `AdminTeamCreateRequestSchema`
- `AdminTeamResponseSchema`

### `PATCH /admin/team/:teamId`

Purpose:

- edit one team name inside the workspace from the admin JWT scope

Request body:

```json
{
  "name": "Engineering"
}
```

Success response: `200`

```json
{
  "team": {
    "id": "tm_product",
    "workspace_id": "ws_hq",
    "name": "Engineering"
  }
}
```

Shared contracts:

- `AdminTeamUpdateRequestSchema`
- `AdminTeamResponseSchema`

### `GET /admin/workspace/:workspaceId/join-code`

Purpose:

- retrieve the current active join code for copy/view flows

Success response: `200`

```json
{
  "workspace": {
    "id": "ws_hq",
    "join_code": "ABC123"
  }
}
```

Shared contract:

- `AdminJoinCodeResponseSchema`

### `POST /admin/workspace/:workspaceId/join-code`

Purpose:

- generate or rotate the active join code for the workspace

Success response: `200`

```json
{
  "workspace": {
    "id": "ws_hq",
    "join_code": "Q7M4K2"
  }
}
```

Shared contract:

- `AdminJoinCodeResponseSchema`

### `GET /admin/workspace/:workspaceId/export`

Purpose:

- export anonymized mood data for one workspace and date range

Query:

- `start_date=YYYY-MM-DD`
- `end_date=YYYY-MM-DD`

Success response: `200 text/csv`

CSV columns:

- `team_id`
- `team_name`
- `mood_type`
- `tags`
- `note_hash`
- `hour_of_day`
- `submission_date`

`tags` is serialized as JSON-array text inside the CSV cell so the backend and mobile-facing contract preserve the original tag list without inventing extra columns.

Shared contracts:

- `AdminExportQuerySchema`
- `AdminExportRecordSchema`

## Validation and error shape

Request validation uses strict shared schemas.

Validation failure response: `400`

```json
{
  "message": "Invalid ... request.",
  "issues": [
    {
      "path": "field_name",
      "message": "Validation message"
    }
  ]
}
```

Auth failure response: `401`

```json
{
  "message": "Unauthorized"
}
```

Scope failure response: `403`

```json
{
  "message": "Forbidden"
}
```

## Privacy rules

Admin API responses must remain privacy-safe:

- never return raw note text
- never return device tokens
- never return member-level identifiers
- never return personal history data
- never overlap with manager dashboard response shapes

The export route is allowed to return `note_hash` only because it is the existing non-raw note representation already used by the backend schema.
