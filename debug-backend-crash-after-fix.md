# Debug Session: backend-crash-after-fix

## Bug Description
User reported that "whatever fixing was done is now making the backend crash". The recent fixes involved modifying `EXPO_PUBLIC_API_BASE_URL` in `.env.local`, adding `3000` to `reversePorts` in `detox.config.cjs`, and changing `+native-intent.tsx` deep link resolution. The backend runs on port 3000. 

## Hypotheses
1. **Hypothesis 1:** The backend crashes due to a malformed JWT token or URL parameter parsing when the mobile app sends a request to `/api/dashboard/team/:teamId/daily` or `/api/workspace/join` after the deep link modifications.
2. **Hypothesis 2:** The backend crashes due to an unhandled promise rejection in the Fastify server when `adb reverse tcp:3000 tcp:3000` forwards an invalid or unexpected connection payload from the Android emulator.
3. **Hypothesis 3:** The backend crashes because the database or Redis connection drops unexpectedly, and the E2E test traffic triggers an unhandled DB exception.
4. **Hypothesis 4:** The crash is an `EADDRINUSE` error because `adb reverse` or another process is holding port 3000, causing a conflict when the backend tries to restart or handle requests.

## Instrumentation Plan
We will instrument the backend's main request handler and error handler in `src/app.ts` to log incoming requests and any uncaught exceptions to the debug server, helping us identify exactly what request or payload is causing the crash.