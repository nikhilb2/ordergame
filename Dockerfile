# syntax=docker/dockerfile:1

# Stage 1: Build on the native builder platform to avoid emulation crashes
FROM --platform=$BUILDPLATFORM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve
FROM --platform=$TARGETPLATFORM node:22-slim

WORKDIR /app
RUN npm install --no-save --no-package-lock serve-handler@6.1.7 compression@1.8.1
COPY --from=build /app/dist /app/dist
COPY server /app/server

EXPOSE 80
CMD ["node", "server/index.mjs"]