# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Run stage
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
# Default DB path; override with DATABASE_PATH (e.g. /data/gigfind.db for Fly volume)
ENV DATABASE_PATH=/app/data/gigfind.db
RUN mkdir -p /app/data
EXPOSE 3000
CMD ["node", "dist/index.js"]
