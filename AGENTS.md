# MoodMarble — Devin Project Rules

## Commit conventions

- **No Devin footer on commits pushed to `master`.** Do not include the
  `Generated with Devin` line or the `Co-Authored-By: Devin` trailer in any
  commit that targets the `master` branch. Write clean, plain commit messages
  only.

## Test commands

| Scope              | Command                                                                   |
| ------------------ | ------------------------------------------------------------------------- |
| Backend unit tests | `pnpm test:backend` (from repo root) or `pnpm test` inside `apps/backend` |
| Mobile unit tests  | `pnpm test:mobile` (from repo root) or `pnpm test` inside `apps/mobile`   |
| E2E preflight      | `pnpm e2e:android:preflight` inside `apps/mobile`                         |
| E2E build          | `pnpm e2e:android:build` inside `apps/mobile`                             |
| E2E test           | `pnpm e2e:android:test` inside `apps/mobile`                              |

## Dev startup

```bash
# 1. Start backend
cd apps/backend && pnpm dev

# 2. Start mobile
cd apps/mobile && pnpm start
```

## Pre-commit hooks (lint-staged + husky)

- Husky v9 is configured — `.husky/pre-commit` runs `npx lint-staged`.
- The root `package.json` `lint-staged` config covers `apps/backend` and `packages` (prettier only).
- `apps/mobile/.lintstagedrc.json` handles the mobile workspace. It runs with `cwd: apps/mobile/` so ESLint resolves `@/` path aliases correctly via the `apps/mobile/eslint.config.js`.
- **Do not** add mobile ESLint rules to the root `lint-staged` config — they will fail because ESLint cannot resolve `@/` aliases from the repo root.

## Seed commands

```bash
cd apps/backend
pnpm db:seed        # seed workspace + teams
pnpm seed:admin     # seed admin credentials (uses ADMIN_EMAIL / ADMIN_PASSWORD from .env)
pnpm seed:dashboard # seed dashboard fixture data for E2E
```
