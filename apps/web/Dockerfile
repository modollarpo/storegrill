# syntax=docker/dockerfile:1
FROM node:24-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---- deps ----------------------------------------------------------------
# Copy ALL workspace package manifests so npm resolves the full graph.
# --ignore-scripts skips prisma postinstall (schema.prisma not present yet).
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

# Region-scoped build-time values baked into the Next.js client bundle.
# Pass via --build-arg. Analytics IDs are public client-side identifiers.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_GA4_MEASUREMENT_ID
ARG NEXT_PUBLIC_GOOGLE_ADS_ID
ARG NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_GA4_MEASUREMENT_ID=$NEXT_PUBLIC_GA4_MEASUREMENT_ID \
    NEXT_PUBLIC_GOOGLE_ADS_ID=$NEXT_PUBLIC_GOOGLE_ADS_ID \
    NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL=$NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL

# 1. Build packages/shared (tsc → dist)
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
RUN npm run build -w packages/shared

# 2. Build apps/web (next build → .next/standalone)
COPY apps/web apps/web
RUN npm run build -w apps/web

# ---- runner: minimal production image ------------------------------------
FROM node:24-alpine AS runner
ENV NODE_ENV=production \
    PORT=80 \
    NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Standalone bundle includes its own node_modules copy — no full install needed
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone        ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static            ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public                  ./apps/web/public

USER root
EXPOSE 80

# server.js is emitted by Next.js standalone at <appRoot>/server.js
CMD ["node", "apps/web/server.js"]
