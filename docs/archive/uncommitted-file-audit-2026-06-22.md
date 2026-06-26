# Uncommitted File Audit - 2026-06-22

## Purpose

This note captures the audit of the uncommitted files that were present before Week 7 admin/export work begins.

The current repository objectives remain:

- preserve the verified Week 3-6 member, history, dashboard, and settings flows
- isolate useful fixes from local debugging residue
- keep Week 7 focused on admin responsibilities and CSV export

## Needed changes

These files contain intentional product or tooling changes that are worth keeping:

- `C:\Users\mauli\Documents\Projects\MoodMarble\apps\mobile\metro.config.js`
  - Needed because the Metro resolver now enables symlink support for the Windows short virtual store setup used by the Android dev-client workflow.
- `C:\Users\mauli\Documents\Projects\MoodMarble\apps\mobile\src\app\index.tsx`
  - Needed because it completes the native in-screen settings handoff already implied by the existing settings screen and tray callbacks, without changing the identity model or widening scope beyond the verified local settings layer.
- `C:\Users\mauli\Documents\Projects\MoodMarble\apps\mobile\src\features\onboarding\home-screen.test.tsx`
  - Needed because it regression-tests the native settings handoff and protects the preserved anonymous session behavior.

## Unnecessary working-tree noise

### Safe to delete

These files are local debugging artifacts and are not part of the product, test suite, or documented delivery scope.

| Full path | File type | Last modified | Size (bytes) | Rationale |
| --- | --- | --- | ---: | --- |
| `C:\Users\mauli\Documents\Projects\MoodMarble\.dbg\android-bundling-mmvs.env` | `.env` | `2026-06-21 22:08:10` | 86 | Debug-server session variables for a local Metro investigation; not needed for builds, tests, or product behavior. |
| `C:\Users\mauli\Documents\Projects\MoodMarble\.dbg\trae-debug-log-android-bundling-mmvs.ndjson` | `.ndjson` | `2026-06-21 22:18:54` | 4810 | Temporary runtime evidence collected during the Android bundling investigation; not consumed by the app or CI. |
| `C:\Users\mauli\Documents\Projects\MoodMarble\apps\mobile\android-bundling-after-reload.xml` | `.xml` | `2026-06-21 22:20:47` | 9386 | Captured Android UI hierarchy snapshot from manual debugging; not referenced anywhere in the repo. |
| `C:\Users\mauli\Documents\Projects\MoodMarble\apps\mobile\android-bundling-after-warm-reload.xml` | `.xml` | `2026-06-21 22:21:52` | 9386 | Captured Android UI hierarchy snapshot from manual debugging; not referenced anywhere in the repo. |
| `C:\Users\mauli\Documents\Projects\MoodMarble\apps\mobile\android-bundling-after-warm-restart.xml` | `.xml` | `2026-06-21 22:22:27` | 11888 | Captured Android UI hierarchy snapshot from manual debugging; not referenced anywhere in the repo. |
| `C:\Users\mauli\Documents\Projects\MoodMarble\apps\mobile\android-bundling-mmvs-ui-final.xml` | `.xml` | `2026-06-21 22:16:56` | 9386 | Captured Android UI hierarchy snapshot from manual debugging; duplicates the same troubleshooting thread and has no product role. |
| `C:\Users\mauli\Documents\Projects\MoodMarble\apps\mobile\android-bundling-mmvs-ui-fixed.xml` | `.xml` | `2026-06-21 22:15:23` | 14948 | Captured Android UI hierarchy snapshot from manual debugging; duplicates the same troubleshooting thread and has no product role. |
| `C:\Users\mauli\Documents\Projects\MoodMarble\apps\mobile\android-bundling-mmvs-ui-post-reverse.xml` | `.xml` | `2026-06-21 22:14:29` | 14948 | Captured Android UI hierarchy snapshot from manual debugging; duplicates the same troubleshooting thread and has no product role. |
| `C:\Users\mauli\Documents\Projects\MoodMarble\apps\mobile\android-bundling-mmvs-ui-post.xml` | `.xml` | `2026-06-21 22:13:54` | 10000 | Captured Android UI hierarchy snapshot from manual debugging; duplicates the same troubleshooting thread and has no product role. |
| `C:\Users\mauli\Documents\Projects\MoodMarble\apps\mobile\android-bundling-mmvs-ui.xml` | `.xml` | `2026-06-21 22:13:01` | 10006 | Captured Android UI hierarchy snapshot from manual debugging; duplicates the same troubleshooting thread and has no product role. |
| `C:\Users\mauli\Documents\Projects\MoodMarble\apps\mobile\android-bundling-mmvs.png` | `.png` | `2026-06-21 22:12:54` | 292057 | Local screenshot used for troubleshooting the Android dev-client session; not a shipping asset. |
| `C:\Users\mauli\Documents\Projects\MoodMarble\apps\mobile\android-bundling-pnv-ui.xml` | `.xml` | `2026-06-21 22:19:40` | 9386 | Captured Android UI hierarchy snapshot from manual debugging; not referenced by app code or docs. |
| `C:\Users\mauli\Documents\Projects\MoodMarble\apps\mobile\android-install-pnv.log` | `.log` | `2026-06-21 22:27:04` | 34177 | Local Gradle/install output log captured for troubleshooting; not needed after the outcome is recorded elsewhere. |
| `C:\Users\mauli\Documents\Projects\MoodMarble\debug-android-bundling-mmvs.md` | `.md` | `2026-06-21 22:09:46` | 2705 | Open debug-session scratchpad for the Metro bundling investigation; useful during diagnosis, but not part of the maintained project docs or current delivery scope. |

### Safe to revert, not delete

| Full path | File type | Last modified | Size (bytes) | Rationale |
| --- | --- | --- | ---: | --- |
| `C:\Users\mauli\Documents\Projects\MoodMarble\README.md` | `.md` | `2026-06-21 20:47:16` | 13390 | Git reports a working-tree modification, but the diff is empty and `git ls-files --eol` shows line-ending drift only. This is not a real content change and should be reverted rather than committed. |
