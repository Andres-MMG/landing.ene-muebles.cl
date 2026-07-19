# syntax=docker/dockerfile:1.6
#
# Next.js 16 production image for the Coolify Compose stack.
# Image SHAs are pinned at Coolify deploy time.
# The web service reaches Strapi via the internal Docker DNS at
# `CMS_INTERNAL_URL` (http://cms:1337). No production URLs are baked
# into this image.

ARG NODE_IMAGE=node:20-alpine
ARG PNPM_VERSION=9.15.9

# ---- base ----
FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /repo

# ---- deps ----
FROM base AS deps
RUN apk add --no-cache python3 make g++ libc6-compat
COPY pnpm-workspace.yaml package.json ./
COPY packages/ui-tokens/package.json packages/ui-tokens/
COPY apps/web/package.json apps/web/
RUN pnpm install --filter web... --no-frozen-lockfile

# ---- build ----
FROM deps AS build
COPY packages/ui-tokens packages/ui-tokens
COPY apps/web apps/web
RUN pnpm --filter web build

# ---- runtime ----
FROM base AS runtime
RUN apk add --no-cache wget
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
WORKDIR /repo
COPY --from=deps  /repo /repo
COPY --from=build /repo/apps/web/.next /repo/apps/web/.next
COPY --from=build /repo/apps/web/next.config.ts /repo/apps/web/
EXPOSE 3000
CMD ["pnpm", "--filter", "web", "start"]
