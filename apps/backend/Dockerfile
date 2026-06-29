# ──────────────────────────────────────────────
# Stage 1: dependency install
# ──────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared/package.json ./packages/shared/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# ──────────────────────────────────────────────
# Stage 2: runtime
# ──────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 appuser

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules 2>/dev/null || true

# Copy source (backend + shared package only)
COPY apps/backend/src ./apps/backend/src
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared ./packages/shared
COPY package.json pnpm-workspace.yaml ./

USER appuser

WORKDIR /app/apps/backend

EXPOSE 3000

CMD ["node_modules/.bin/tsx", "src/server.ts"]
