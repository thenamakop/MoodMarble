# syntax=docker/dockerfile:1
FROM node:20-alpine AS deps

WORKDIR /app

# Enable pnpm via corepack (matches packageManager in backend package.json)
RUN corepack enable

# Copy the files pnpm needs to compute the install plan.
# These are the ONLY files needed before install — copying anything else
# here would bust the layer cache on every source code change.
COPY .npmrc ./
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY apps/backend/package.json ./apps/backend/package.json

# Install production dependencies only.
# --frozen-lockfile: fail if lockfile is out of date.
# --prod: skip all devDependencies (jest, ts-jest, drizzle-kit, etc.).
# Result: tsx, typescript, fastify, drizzle-orm, etc. in /app/node_modules/
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# ─────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Create a non-root user. Running as root inside containers is a
# security risk — Railway and most platforms warn about it.
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 --ingroup nodejs appuser

# Copy the installed node_modules from the deps stage.
# With node-linker=hoisted, all packages are in the root node_modules.
COPY --from=deps --chown=appuser:nodejs /app/node_modules ./node_modules

# Copy the backend source code.
COPY --chown=appuser:nodejs apps/backend/src ./apps/backend/src

# Copy the shared workspace package source (required by backend imports).
COPY --chown=appuser:nodejs packages/shared ./packages/shared

# Copy the Drizzle migration SQL files. db:migrate reads these at
# runtime from the filesystem path in MIGRATIONS_DIRECTORY.
COPY --chown=appuser:nodejs apps/backend/drizzle ./apps/backend/drizzle

# Copy config files that tsx/Node needs to resolve the module graph.
COPY --chown=appuser:nodejs apps/backend/package.json ./apps/backend/package.json
COPY --chown=appuser:nodejs apps/backend/tsconfig.json ./apps/backend/tsconfig.json

# Copy root workspace manifest (needed for pnpm workspace resolution at runtime).
COPY --chown=appuser:nodejs package.json ./package.json
COPY --chown=appuser:nodejs pnpm-workspace.yaml ./pnpm-workspace.yaml

USER appuser

# Mark the container as a production runtime. This prevents test-only
# routes (e.g. /__test/reset) from being registered by app.ts.
ENV NODE_ENV=production

# tsx is at /app/node_modules/.bin/tsx (hoisted install).
# We keep WORKDIR=/app so all __dirname-relative paths in the source
# resolve correctly: env.ts's __dirname = /app/apps/backend/src/config.
EXPOSE 3000

CMD ["node_modules/.bin/tsx", "apps/backend/src/server.ts"]
