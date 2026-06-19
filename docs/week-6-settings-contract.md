# Week 6 Settings Contract

## Purpose

This note locks the local-first behavior for Week 6 reminder prompts and settings before any UI or notification scheduling work begins.

The source of truth remains:

- `MoodMarble_Project_Specification.docx`

If any repository note conflicts with the `.docx`, the `.docx` wins.

## Local-only settings model

Week 6 reminder settings stay on-device only. No backend route, shared contract, analytics event, or identity record is introduced for reminder preferences.

The minimal persisted settings shape is:

```ts
{
  version: 1,
  remindersEnabled: boolean,
  reminderTimes: string[],
  replayOnboarding: boolean,
}
```

The contract for each field is:

- `version`: local schema version for storage safety and future migration
- `remindersEnabled`: controls whether MoodMarble should schedule device-local reminders
- `reminderTimes`: `1-3` unique local clock times in `HH:MM` 24-hour format
- `replayOnboarding`: a local flag that tells the app to show onboarding again on the next relevant entry

## Reminder behavior

Reminder behavior is defined as:

- reminders are disabled by default
- the default suggested reminder time is `18:00`
- reminder times are stored as local wall-clock times only
- no timezone offset is persisted
- duplicate reminder times are collapsed
- reminder times are stored in ascending order
- users may configure `1-3` reminder times
- opting out sets `remindersEnabled` to `false`
- opt-out preserves the most recent configured reminder times so re-enable can reuse them

Notification permission is not part of persisted settings state. Permission is a device capability check that should be read at scheduling time.

When scheduling is implemented, the scheduler must:

- schedule reminders only when `remindersEnabled` is `true`
- cancel scheduled reminders when the user opts out
- use friendly, non-intrusive copy
- treat stored times as local device times for the current timezone

## Onboarding replay behavior

Onboarding replay remains local-only.

The replay contract is:

- replaying onboarding does not create a new identity model
- replaying onboarding does not write anything to the backend
- replaying onboarding does not automatically clear local history
- replaying onboarding does not automatically clear reminder settings
- the app sets `replayOnboarding` to `true` when the user requests a replay
- the routing layer later consumes that flag and resets it after the replay begins

## Local data deletion behavior

The Week 6 local data deletion action is defined as a device-only cleanup flow.

When implemented, it must clear:

- the anonymous session
- local personal mood history
- local reminder settings, including `replayOnboarding`
- any scheduled local reminder notifications

Local data deletion must not:

- delete backend mood submissions
- create server-side deletion APIs
- affect manager dashboards or analytics
- introduce sync or export behavior

## Out of scope for this contract

This contract does not begin:

- backend persistence for notification preferences
- manager or admin reminder behavior
- reminder analytics
- cross-device restore
- offline queueing or sync
