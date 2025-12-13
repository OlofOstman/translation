FROM node:18-alpine

WORKDIR /app

# Copy root package.json for workspaces
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY shared/package*.json ./shared/

# Copy TypeScript configs
COPY backend/tsconfig.json ./backend/
COPY shared/tsconfig.json ./shared/

# Install dependencies (from root to handle workspaces)
RUN npm ci

# Copy source files
COPY backend/src ./backend/src
COPY shared/src ./shared/src

# Build TypeScript
WORKDIR /app/backend
RUN npm run build

# Expose port
EXPOSE 3001

# Start server
CMD ["npm", "start"]

