# Use official Node.js LTS Alpine base image
FROM node:20-alpine

# Set working directory inside container
WORKDIR /app

# Copy package manifests
COPY package*.json ./

# Install production dependencies cleanly
RUN npm ci --only=production

# Copy application source files
COPY . .

# Expose API port
EXPOSE 3000

# Set production environment variable
ENV NODE_ENV=production

# Start Express.js Student REST API server
CMD ["npm", "start"]
