# Week 5 Dashboard Data Source

## Purpose

This note defines the canonical backend fields that are safe to aggregate for the Week 5 manager dashboard.

The source of truth remains:

- `MoodMarble_Project_Specification.docx`

If any repository note conflicts with the `.docx`, the `.docx` wins.

## Canonical analytics source

Week 5 manager analytics must derive from anonymous backend data only.

The canonical analytics tables are:

- `mood_submissions`
- `team_members`
- `teams`

## Safe aggregation fields

### From `mood_submissions`

These fields are safe to aggregate for manager-facing views:

- `team_id`
- `mood_type`
- `tags`
- `hour_of_day`
- `submission_date`

These fields map to dashboard surfaces as follows:

- daily analytics:
  - filter by `team_id`
  - filter by `submission_date`
  - group by `hour_of_day`
  - count by `mood_type`
  - count total submissions
- weekly analytics:
  - filter by `team_id`
  - filter by `submission_date` range
  - group by `submission_date`
  - count total submissions
  - compute aggregate mood trend from mood-type scoring
  - compute overall mood distribution from `mood_type`
- tag analytics:
  - filter by `team_id`
  - filter by `submission_date` range
  - unnest and count `tags`

### From `team_members`

These fields are safe to use only for privacy threshold evaluation and route scope checks:

- `team_id`
- row count per team
- `role`

Allowed usage:

- count members in a team for the `fewer than 5 members` blur rule
- confirm manager/team scope where needed

### From `teams`

These fields are safe to use only for scope resolution:

- `id`
- `workspace_id`

Allowed usage:

- confirm that a requested team belongs to the manager token workspace
- bind dashboard access to the correct team and workspace

## Explicitly excluded fields

The following must never be exposed in manager analytics responses:

- `mood_submissions.id`
- `mood_submissions.note_hash`
- `team_members.device_token`
- `team_members.joined_at`
- any raw note text
- any device identifier
- any name, email, user profile, or other identity field

## Privacy rule application

The central helper for Week 5 privacy enforcement is:

- `apps/backend/src/services/dashboard-privacy.ts`

It applies the same threshold rules across daily, weekly, and tag routes:

- hide output below `5` submissions in the selected window
- blur exact values when the team has fewer than `5` members
- hide hour-level drill-down below `3` submissions in the selected hour

Routes should use this helper for:

- top-level window privacy
- per-hour privacy
- conversion of exact counts to `exact`, `range`, or `hidden`
- conversion of exact scores to `exact`, `range`, or `hidden`

## Week 5 boundary reminder

This data-source mapping does not permit analytics work to read from or change:

- onboarding/session flows
- local-only personal history
- notifications
- admin tooling
- exports
- any new identity model
