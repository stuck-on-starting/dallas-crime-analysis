FROM node:20-alpine

WORKDIR /app

# Install build tools needed for better-sqlite3 native module
RUN apk add --no-cache python3 make g++

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and compile TypeScript
COPY tsconfig.json ./
COPY src/ ./src/
COPY database/schema.sql ./database/schema.sql
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

EXPOSE 3000

CMD ["node", "dist/api/server.js"]
