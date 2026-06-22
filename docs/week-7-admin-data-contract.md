# Week 7 Admin Data Contract

## Purpose

This document defines how the Week 7 admin layer fits into the current backend data model before route implementation begins.

The source of truth remains:

- `MoodMarble_Project_Specification.docx`

If any repository note conflicts with the `.docx`, the `.docx` wins.

## Scope of this document

This task defines:

- the existing schema touchpoints reused by admin work
- the minimum data fields needed for workspace creation, team creation, team editing, join code generation, and CSV export
- the privacy boundaries that admin route work must preserve

This task does not add:

- a new identity system
- account records
- profile data
- onboarding changes
- anonymous session changes
- mood submission changes
- local history changes
- manager dashboard changes
- notification or settings changes

## Current backend entities reused as-is

Week 7 admin work should extend the existing backend model instead of inventing a parallel management structure.

The core entities already exist:

- `workspaces`
  - `id`
  - `name`
  - `join_code`
  - `created_at`
- `teams`
  - `id`
  - `workspace_id`
  - `name`
  - `created_at`
- `mood_submissions`
  - `team_id`
  - `mood_type`
  - `tags`
  - `note_hash`
  - `hour_of_day`
  - `submission_date`

These fields already cover the Week 7 admin responsibilities:

- workspace creation writes a `workspaces` row
- team creation and editing write `teams` rows scoped by `workspace_id`
- join code generation updates `workspaces.join_code`
- CSV export reads anonymised submission data by joining `mood_submissions` to `teams` inside one workspace

## Safe touchpoints and non-touchpoints

The admin layer should use these schema touchpoints:

- `workspaces` as the source of truth for workspace identity and active join code
- `teams` as the source of truth for workspace-owned teams
- `mood_submissions` as the source of truth for anonymised export data

The admin layer should not use these as its source of truth:

- `team_members` for workspace admin identity
- device tokens for admin authorization
- any member session object for admin state

`team_members` remains an anonymous participation table. It is team-scoped, while the Week 7 admin boundary is workspace-scoped. Reusing `team_members.role = "admin"` as the primary admin model would blur the member/admin boundary and does not match the current workspace-scoped admin JWT contract.

## Minimal admin contract

The minimum shared admin contract is:

- workspace creation request
  - `name`
- workspace creation response
  - `workspace.id`
  - `workspace.name`
  - `workspace.join_code`
  - `admin_jwt`
- team creation request
  - `name`
- team edit request
  - `name`
- team response
  - `team.id`
  - `team.workspace_id`
  - `team.name`
- join code response
  - `workspace.id`
  - `workspace.join_code`
- export query
  - `start_date`
  - `end_date`
- export record
  - `team_id`
  - `team_name`
  - `mood_type`
  - `tags`
  - `note_hash`
  - `hour_of_day`
  - `submission_date`

These contracts are now captured in `packages/shared/schemas.ts`.

## Route mapping

The next route work should map to the data model like this:

- workspace creation
  - create `workspaces.id`
  - persist `workspaces.name`
  - generate and persist one active `workspaces.join_code`
  - issue a workspace-scoped admin JWT
- team creation
  - create `teams.id`
  - bind `teams.workspace_id` from the admin JWT scope
  - persist `teams.name`
- team editing
  - keep `teams.id`
  - keep `teams.workspace_id`
  - update `teams.name`
- join code generation
  - keep `workspaces.id`
  - replace `workspaces.join_code`
  - do not create a second identity model
- CSV export
  - filter submissions by workspace through `teams.workspace_id`
  - export only anonymised fields
  - never export raw note text, device tokens, or member identity data

## Privacy rules locked for Week 7

Admin route work must keep the existing anonymity model intact:

- no raw note text in export output
- no device token in export output
- no user profile or account fields in admin payloads
- no personal history storage in admin models
- no changes to the anonymous member join contract unless a defect forces the smallest safe fix

`note_hash` is safe to reuse because it already exists as the non-raw note representation in `mood_submissions`.

## Schema change decision for Task 3

No database migration is required for this task.

Reason:

- the existing `workspaces` table already supports workspace creation and join code management
- the existing `teams` table already supports team creation and team editing
- the existing `mood_submissions` table already supports anonymised export reads
- this task’s main risk was ambiguity, not missing persistence primitives

Potential future constraints such as duplicate team-name handling can be decided during route implementation if the specification or runtime behavior makes them necessary, but they are not required to define the Week 7 contract safely.
