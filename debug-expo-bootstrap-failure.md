# Debug Session: expo-bootstrap-failure

Status: OPEN

Scope:
- Fix the current Expo bootstrap/runtime failure only.
- Do not change product behavior or backend logic.

Symptoms:
- Web bundling fails.
- Expo Go on iPhone shows a generic error.
- Metro fails during router/runtime bootstrap.
- Critical error mentions unresolved `@expo/metro-runtime/error-overlay` from `expo-router`.

Hypotheses:
- `expo-router` is incompatible with the installed Expo SDK / metro runtime.
- Mixed Expo major versions exist in the workspace dependency graph.
- Stale install artifacts are preserving an incompatible resolution.
- There is more than one valid Expo app root or stale nested app config.
- Expo tooling will recommend a different SDK 54 compatibility set than the current pins.

Planned evidence collection:
- Inspect root and mobile package manifests.
- Inspect workspace layout for extra Expo app roots.
- Capture installed dependency tree and Expo doctor output.
- Clean stale install artifacts and reinstall with a single package manager.
- Reproduce startup on web and Go after dependency graph is clean.

Findings:
- The repo has one Expo app root: `apps/mobile`.
- Before cleanup, the lockfile resolved `expo@54.0.35` with `@expo/metro-runtime@56.0.15`.
- `expo-router@6.0.24` requires `@expo/metro-runtime@^6.1.2`, and the `56.0.15` package did not export `./error-overlay`.
- After deleting install artifacts and reinstalling with `pnpm`, the resolution changed to `@expo/metro-runtime@6.1.2`.
- After the dependency graph was fixed, the first web runtime error changed to `Unable to resolve module zod` from `packages/shared/schemas.ts`.
- Adding `zod` to `apps/mobile` fixed Metro resolution for shared schemas.
- The next runtime error was an invalid element type in `src/app/_layout.tsx` caused by importing `ThemeProvider`, `DarkTheme`, and `DefaultTheme` from `expo-router`.
- Switching those imports to `@react-navigation/native` restored web rendering without changing product behavior.

Current status:
- Local web start succeeds and renders the app shell and marble submission screen.
- Expo Go start succeeds and exposes the QR / `exp://` endpoint locally.
- Awaiting user confirmation on physical iPhone verification before cleanup.
