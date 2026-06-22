# Week 7 Admin Freeze

## Purpose

This note freezes the verified base before any new Week 7 admin or export code is written.

The source of truth remains:

- `MoodMarble_Project_Specification.docx`

If any repository note conflicts with the `.docx`, the `.docx` wins.

## Verified base checkpoint

Week 7 starts from the verified repository state at commit:

- `6fb91d2ed77af44b8f156023678a288ded3dd720`

The working tree was clean when this checkpoint was created:

- `git status --short --branch` returned `## master...origin/master`

The explicit checkpoint branch for the verified base is:

- `week7/verified-base`

This branch exists so future admin work can be compared against the preserved member, history, dashboard, and settings layers without ambiguity.

## Stable layers that remain intentionally preserved

The following repository layers are treated as verified and frozen for Week 7 unless a defect forces the smallest possible fix:

- Week 3 member onboarding and anonymous session flow
- Week 4 local-only personal history storage and presentation
- Week 5 manager dashboard data and privacy behavior
- Week 6 notifications and settings behavior

The freeze is anchored by these repository notes:

- `docs/week-3-workspace-audit.md`
- `docs/week-4-handoff.md`
- `docs/week-5-handoff.md`
- `docs/week-6-handoff.md`
- `docs/week-6-settings-contract.md`

## Week 7 allowed scope

Week 7 is limited to the admin responsibilities already described by the specification and `docs/task-tracker.md`:

- workspace creation
- team management
- join code generation
- join code viewing and copying
- anonymised CSV export
- the minimum route wiring or admin UI entry points needed to reach those flows

The corresponding Week 7 tracker items are:

- `MM-W7-01` admin team management and join-code APIs
- `MM-W7-02` anonymised CSV export
- `MM-W7-03` admin panel
- `MM-W7-04` admin JWT authorization flow

## Frozen and out of scope

Do not change or expand these areas during Week 7 unless a bug forces a very small, directly related fix:

- onboarding UI or anonymous join flow
- anonymous session creation, persistence, or recovery
- mood submission contracts, payloads, or member-facing flow
- local personal history storage or screens
- manager dashboard logic, privacy rules, or widgets
- notifications behavior, scheduling, or reminder settings
- any new identity, account, profile, or login model beyond the spec-defined minimum for admin protection

Non-code noise also stays out of the Week 7 change set:

- local debug files
- screenshots
- temporary logs
- one-off investigation notes not needed for the permanent repository record

## Week 7 change gate

Before starting each Week 7 task:

- keep the working tree focused on the current admin/export change only
- keep frozen-area edits out of the diff unless a blocker demands the smallest safe fix
- run only the relevant tests needed to prove the touched admin/export behavior and that preserved layers still hold
- keep commits human-readable and scoped to one task at a time
