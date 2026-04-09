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

RUN npm install -g serve

WORKDIR /app
COPY --from=build /app/dist /app/dist

EXPOSE 80
CMD ["serve", "-s", "/app/dist", "-l", "80"]