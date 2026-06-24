# Debug Session: backend-crash

## 1. Bug Description
The user reported that the backend Node.js process crashes (exits with code 4294967295) after the recent "fixing" was applied. The "fixing" refers to the previous assistant's attempt to instrument the backend with `TRAE-debugger` by adding `process.on('uncaughtException')` and `process.on('unhandledRejection')` handlers that called `fetch()` without exiting the process.

## 2. Hypotheses
- **H1:** The `process.on('uncaughtException')` handler added by the previous assistant does not call `process.exit(1)`. When an exception occurs, the process continues in an undefined state and eventually crashes at the native level (exit code 4294967295).
- **H2:** Calling the global asynchronous `fetch` inside `uncaughtException` triggers an unsafe event loop tick on Windows, leading to an immediate native crash.
- **H3:** The crash is unrelated to the instrumentation and is actually caused by the Android emulator's connection to `10.0.2.2:3000` sending malformed TCP packets that `ioredis` or Fastify cannot handle natively.

## 3. Evidence Collection
- **Action:** Removed the `process.on` instrumentation from `apps/backend/src/server.ts` to test H1 and H2.
- **Observation:** Ran `pnpm --filter backend dev` and executed manual API requests and E2E tests. The backend remained stable and did not crash.

## 4. Conclusion
The crash was caused by the improper use of asynchronous `fetch` inside synchronous `uncaughtException` and `unhandledRejection` hooks without terminating the process, which caused a native Node.js crash (exit code 4294967295) when any error occurred.

## 5. Next Steps
The backend crash has been resolved by removing the faulty debugging code. We will now ensure the E2E test runs successfully and verify the manager dashboard journey works.