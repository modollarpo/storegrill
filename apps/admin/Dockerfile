# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---- deps ----------------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
COPY packages/shared/package.json  packages/shared/package.json
COPY apps/api/package.json          apps/api/package.json
COPY apps/web/package.json          apps/web/package.json
COPY apps/admin/package.json        apps/admin/package.json
COPY apps/vendor-portal/package.json apps/vendor-portal/package.json
RUN npm ci --ignore-scripts

# ---- builder -------------------------------------------------------------
FROM deps AS builder

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
RUN npm run build -w packages/shared

COPY apps/admin apps/admin
RUN npm run build -w apps/admin

# ---- runner: minimal production image ------------------------------------
FROM node:20-alpine AS runner
ENV NODE_ENV=production \
    PORT=80 \
    NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/public ./apps/admin/public

USER root
EXPOSE 80

CMD ["node", "apps/admin/server.js"]
