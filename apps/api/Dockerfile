# syntax=docker/dockerfile:1
# Debian-based image: Prisma 5.x ships openSSL 3 binaries for glibc reliably.
FROM node:20-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Deps stage: install the whole workspace graph (deps hoist to /app/node_modules)
FROM base AS deps
COPY package.json package-lock.json ./
COPY packages/shared/package.json  packages/shared/package.json
COPY apps/api/package.json          apps/api/package.json
RUN npm ci --ignore-scripts

# Builder stage
FROM deps AS builder
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run db:generate -w apps/api
RUN npm run build -w packages/shared
RUN npm run build -w apps/api

# Runner stage: minimal runtime using the hoisted root node_modules.
FROM node:20-slim AS runner
ENV NODE_ENV=production PORT=80
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl curl && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/package.json                    ./package.json
COPY --from=builder /app/node_modules                    ./node_modules
COPY --from=builder /app/apps/api/dist                   ./apps/api/dist
COPY --from=builder /app/apps/api/prisma                 ./apps/api/prisma
COPY --from=builder /app/apps/api/package.json           ./apps/api/package.json
COPY --from=builder /app/packages/shared/dist            ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json    ./packages/shared/package.json

EXPOSE 80
CMD ["node", "apps/api/dist/index.js"]
