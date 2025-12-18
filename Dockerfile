# Use the official Node.js runtime as a parent image
FROM node:20-alpine AS base

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies (including devDependencies for build)
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build stage
FROM base AS builder

# Accept build arguments for Next.js public environment variables
ARG NEXT_PUBLIC_API_URL=""
ARG NEXT_PUBLIC_ENV=""

# Make them available as environment variables during build
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_ENV=$NEXT_PUBLIC_ENV

# Build the Next.js application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

# Use existing "node" user (UID 1000) which is built into node:alpine images
# This matches typical host user UID for proper file permissions with volume mounts

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown node:node .next

# Create logs directory with proper permissions for file writes
RUN mkdir -p /app/logs && chown -R node:node /app/logs

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

# Install Cloudflare Origin CA for SSL verification
COPY certs/cloudflare-origin-ca-rsa.crt /usr/local/share/ca-certificates/
RUN apk add --no-cache ca-certificates && update-ca-certificates

ENV NODE_EXTRA_CA_CERTS=/usr/local/share/ca-certificates/cloudflare-origin-ca-rsa.crt

USER node

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
