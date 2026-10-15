# ==========================
# Base Image
# ==========================
FROM node:22-alpine

# ==========================
# Working Directory
# ==========================
WORKDIR /app

# ==========================
# Copy package files
# ==========================
COPY package*.json ./

COPY apps/api/package*.json apps/api/

COPY packages/shared/package*.json packages/shared/

# ==========================
# Install Dependencies
# ==========================
RUN npm install

# ==========================
# Copy Source Code
# ==========================
COPY . .

# ==========================
# Generate Prisma Client
# ==========================
RUN npm run db:generate

# ==========================
# Expose Port
# ==========================
EXPOSE 3001

# ==========================
# Start API
# ==========================
CMD ["npm","run","dev:api"]