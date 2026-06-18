# Week 5 Dashboard Contract

## Purpose

This document defines the exact Week 5 backend response shape and the minimum safe manager authorization boundary before dashboard implementation begins.

The source of truth remains:

- `MoodMarble_Project_Specification.docx`

If any repository note conflicts with the `.docx`, the `.docx` wins.

## Scope of this document

This task defines:

- backend response contracts for dashboard endpoints
- privacy-state and blur-state transport rules
- frontend consumption rules for manager dashboard data
- the smallest safe manager JWT boundary for Week 5 routes

This task does not add:

- charts
- widgets
- onboarding changes
- anonymous member flow changes
- notifications
- admin tooling
- exports
- any new identity model

## Manager authorization boundary

All dashboard endpoints must require a manager JWT.

The minimum safe manager JWT payload is:

```json
{
  "workspace_id": "ws_123",
  "team_id": "tm_product",
  "role": "manager"
}
```

The manager JWT must be:

- separate from the anonymous device JWT
- scoped to exactly one workspace and one team
- limited to the existing `manager` role only
- valid for `30 days` to stay aligned with the current JWT lifetime rule

The dashboard route protection rules are:

- `401 Unauthorized` when the bearer token is missing, invalid, expired, or not a manager token
- `403 Forbidden` when the manager token is valid but the `team_id` in the token does not match the requested `:teamId`
- `403 Forbidden` when the manager token workspace scope does not match the resolved team workspace

This boundary adds no new identity model. It only introduces a privileged team-scoped token for manager dashboard access.

## Shared privacy transport model

Every dashboard response must include a top-level `privacy` object:

```json
{
  "visibility": "visible | blurred | hidden",
  "reasons": [
    "minimum_submissions",
    "minimum_members_for_precise_values",
    "minimum_hourly_submissions"
  ],
  "thresholds": {
    "minimum_submissions": 5,
    "minimum_members_for_precise_values": 5,
    "minimum_hourly_submissions": 3
  }
}
```

Interpretation:

- `visible`: the frontend may render exact aggregate values
- `blurred`: the frontend must render ranges only and must not reconstruct exact counts
- `hidden`: the frontend must render a threshold state, not data

Each aggregate metric must use one of these transport forms:

```json
{ "kind": "exact", "value": 8 }
```

```json
{ "kind": "range", "min": 5, "max": 9 }
```

```json
{ "kind": "hidden" }
```

Frontend rule:

- never infer privacy state from raw counts
- only use the backend-provided `privacy` and metric `kind`

## Shared alert transport model

Every dashboard response must include `summary.alert_state`:

```json
{
  "status": "hidden | inactive | active",
  "message": null
}
```

Rules:

- `hidden`: do not render an alert banner
- `inactive`: do not render an alert banner
- `active`: render the alert banner using the backend-provided `message`

This keeps alert rendering explicit without forcing the frontend to guess alert logic.

## Endpoint contracts

### `GET /dashboard/team/:teamId/daily`

Purpose:

- feed the daily mood heatmap
- feed same-day submission volume by hour
- expose per-hour privacy state so low-volume hours cannot be drilled into

Response shape:

```json
{
  "team_id": "tm_product",
  "date": "2026-06-18",
  "privacy": {
    "visibility": "visible",
    "reasons": [],
    "thresholds": {
      "minimum_submissions": 5,
      "minimum_members_for_precise_values": 5,
      "minimum_hourly_submissions": 3
    }
  },
  "summary": {
    "total_submissions": { "kind": "exact", "value": 8 },
    "mood_distribution": [
      { "mood_type": "happy", "count": { "kind": "exact", "value": 4 } },
      { "mood_type": "focused", "count": { "kind": "exact", "value": 4 } }
    ],
    "alert_state": {
      "status": "inactive",
      "message": null
    }
  },
  "hourly_buckets": [
    {
      "hour_of_day": 9,
      "privacy": {
        "visibility": "visible",
        "reasons": [],
        "thresholds": {
          "minimum_submissions": 5,
          "minimum_members_for_precise_values": 5,
          "minimum_hourly_submissions": 3
        }
      },
      "total_submissions": { "kind": "exact", "value": 4 },
      "average_mood_score": { "kind": "exact", "value": 7 },
      "mood_counts": [
        { "mood_type": "happy", "count": { "kind": "exact", "value": 3 } },
        { "mood_type": "focused", "count": { "kind": "exact", "value": 1 } }
      ]
    }
  ]
}
```

Frontend consumption:

- use `hourly_buckets[*].mood_counts` for the heatmap cell coloring
- use `hourly_buckets[*].total_submissions` for hourly submission volume
- disable drill-down when `hourly_buckets[*].privacy.visibility` is `hidden`
- render exact values only for `kind: "exact"`
- render `min-max` text only for `kind: "range"`

### `GET /dashboard/team/:teamId/weekly`

Purpose:

- feed the weekly trend line
- feed the weekly submission volume view
- expose the weekly summary ring and alert state

Response shape:

```json
{
  "team_id": "tm_product",
  "window": {
    "start_date": "2026-06-15",
    "end_date": "2026-06-21"
  },
  "privacy": {
    "visibility": "blurred",
    "reasons": ["minimum_members_for_precise_values"],
    "thresholds": {
      "minimum_submissions": 5,
      "minimum_members_for_precise_values": 5,
      "minimum_hourly_submissions": 3
    }
  },
  "summary": {
    "total_submissions": { "kind": "range", "min": 5, "max": 9 },
    "mood_distribution": [
      { "mood_type": "stressed", "count": { "kind": "range", "min": 2, "max": 4 } }
    ],
    "alert_state": {
      "status": "active",
      "message": "Team mood alert available."
    }
  },
  "daily_points": [
    {
      "date": "2026-06-15",
      "privacy": {
        "visibility": "blurred",
        "reasons": ["minimum_members_for_precise_values"],
        "thresholds": {
          "minimum_submissions": 5,
          "minimum_members_for_precise_values": 5,
          "minimum_hourly_submissions": 3
        }
      },
      "total_submissions": { "kind": "range", "min": 1, "max": 2 },
      "average_mood_score": { "kind": "range", "min": 4, "max": 6 }
    }
  ]
}
```

Frontend consumption:

- use `daily_points[*].average_mood_score` for the trend line
- use `daily_points[*].total_submissions` for weekly submission volume
- use `summary.mood_distribution` for the mood distribution ring
- show the alert banner only when `summary.alert_state.status` is `active`

### `GET /dashboard/team/:teamId/tags`

Purpose:

- feed the weekly tag frequency chart
- keep the same privacy and alert contract as the other dashboard surfaces

Response shape:

```json
{
  "team_id": "tm_product",
  "window": {
    "start_date": "2026-06-15",
    "end_date": "2026-06-21"
  },
  "privacy": {
    "visibility": "visible",
    "reasons": [],
    "thresholds": {
      "minimum_submissions": 5,
      "minimum_members_for_precise_values": 5,
      "minimum_hourly_submissions": 3
    }
  },
  "summary": {
    "total_submissions": { "kind": "exact", "value": 12 },
    "mood_distribution": [
      { "mood_type": "happy", "count": { "kind": "exact", "value": 6 } },
      { "mood_type": "focused", "count": { "kind": "exact", "value": 6 } }
    ],
    "alert_state": {
      "status": "inactive",
      "message": null
    }
  },
  "tag_counts": [
    { "tag": "#workload", "count": { "kind": "exact", "value": 5 } },
    { "tag": "#team", "count": { "kind": "exact", "value": 3 } }
  ]
}
```

Frontend consumption:

- use `tag_counts` for the tag frequency chart
- use `summary.total_submissions` for the panel header or supporting copy
- respect `privacy.visibility` before rendering labels or values

## Implementation boundary for the next task

The next implementation task should add only:

- shared contract usage from `packages/shared`
- manager JWT verification on dashboard routes
- route-level team-scope checks
- aggregate-only service responses that conform exactly to these schemas

The next task must not add:

- dashboard chart rendering logic
- onboarding or member session changes
- anonymous member token changes
- admin or export routes
