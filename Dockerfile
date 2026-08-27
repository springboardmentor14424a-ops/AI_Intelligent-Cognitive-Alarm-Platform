# Multi-Stage Dockerfile for Backend and Frontend

# ------------------------------------
# 1. Server Build Stage
# ------------------------------------
FROM node:20-alpine AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install
COPY server/ ./
RUN npm run build

# ------------------------------------
# 2. Client Build Stage
# ------------------------------------
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# ------------------------------------
# 3. Server Production Runner
# ------------------------------------
FROM node:20-alpine AS server-runner
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install --only=production
COPY --from=server-builder /app/server/dist ./dist
EXPOSE 5000
ENV NODE_ENV=production
ENV PORT=5000
CMD ["node", "dist/app.js"]
