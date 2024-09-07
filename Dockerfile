# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-slim AS base

RUN apt-get update -qq
RUN apt-get install --no-install-recommends -y ca-certificates curl
RUN apt-get clean
RUN rm -rf /var/lib/apt/lists/*

# Node.js app lives here
WORKDIR /app

# Enable corepack
RUN corepack enable
RUN pnpm --version

# Install node modules
COPY . .
RUN pnpm i --prod

# Set production environment
ENV PORT=3000

# Start the server by default, this can be overwritten at runtime
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 CMD curl --fail http://localhost:3000 || exit 1
CMD [ "pnpm", "start" ]

