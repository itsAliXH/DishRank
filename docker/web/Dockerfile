FROM node:22-alpine

WORKDIR /app

# Copy workspace package files
COPY package*.json ./
COPY apps/web/package*.json apps/web/
COPY packages/shared/package*.json packages/shared/

# Install dependencies
RUN npm install

# Copy source code
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev", "--workspace=apps/web", "--", "-H", "0.0.0.0"]