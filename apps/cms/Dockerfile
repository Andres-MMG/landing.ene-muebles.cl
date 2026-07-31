# syntax=docker/dockerfile:1.6
#
# Strapi v5 production image for the Coolify Compose stack.
# Image SHAs are pinned at Coolify deploy time.

ARG NODE_IMAGE=node:20-alpine
ARG PNPM_VERSION=9.15.9

# ---- base ----
FROM ${NODE_IMAGE} AS base
ARG PNPM_VERSION
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /repo

# ---- deps ----
# python3 + build tools required to compile native modules (sharp, better-sqlite3).
FROM base AS deps
RUN apk add --no-cache python3 make g++ libc6-compat
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/ui-tokens/package.json packages/ui-tokens/
COPY apps/cms/package.json apps/cms/
RUN pnpm install --filter cms... --frozen-lockfile

# ---- build ----
FROM deps AS build
ARG PUBLIC_URL
ENV PUBLIC_URL=${PUBLIC_URL}
COPY packages/ui-tokens packages/ui-tokens
COPY apps/cms apps/cms
RUN pnpm --filter cms build

# ---- runtime ----
FROM base AS runtime
RUN apk add --no-cache wget
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=deps  /repo /repo
# Keep the TypeScript project inputs alongside dist: `strapi start` parses
# tsconfig.json to resolve outDir before booting the compiled application.
COPY --from=build /repo/apps/cms /repo/apps/cms
EXPOSE 1337
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=5 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:1337/admin || exit 1
CMD ["pnpm", "--filter", "cms", "start"]
