# syntax=docker/dockerfile:1.7
# ============================================================
# PMNH Jazan Research Portal — production image
# Multi-stage build → small final image (only the standalone server +
# .next/static + public assets), running as a non-root user.
# ============================================================

ARG NODE_VERSION=20.15.0-alpine3.20

# -------- deps stage --------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app

# Use BuildKit cache mount to speed up repeat builds.
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --include=dev

# -------- builder stage --------
FROM node:${NODE_VERSION} AS builder
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build args become NEXT_PUBLIC_* env vars at build time.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_DEMO_MODE=false
ARG NEXT_PUBLIC_APP_NAME="Health and Nursing Research Unit"
ARG NEXT_PUBLIC_HOSPITAL_NAME="Prince Mohammed Bin Nasser Hospital"
ARG NEXT_PUBLIC_HOSPITAL_LOCATION="Jazan, Kingdom of Saudi Arabia"
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_DEMO_MODE=$NEXT_PUBLIC_DEMO_MODE \
    NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME \
    NEXT_PUBLIC_HOSPITAL_NAME=$NEXT_PUBLIC_HOSPITAL_NAME \
    NEXT_PUBLIC_HOSPITAL_LOCATION=$NEXT_PUBLIC_HOSPITAL_LOCATION

RUN npm run build

# -------- runner stage --------
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Non-root user — prevents container processes from being able to write to
# the image filesystem and reduces blast radius of any RCE.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 --ingroup nodejs nextjs

# Copy only the standalone server + static assets. This is what makes the
# final image small — node_modules is pruned to the bare minimum the
# standalone server needs.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

# Liveness probe used by Docker / orchestrators. Hits the homepage which we
# made public-cache-safe earlier.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# The standalone build produces a server.js entry point.
CMD ["node", "server.js"]
