# ============================================================================
# GitHub Widgets - Production Dockerfile
# ============================================================================
# This Dockerfile creates a production-ready container for the GitHub Widgets
# standalone Express server. It uses multi-stage builds and Alpine Linux for
# minimal image size while maintaining security and performance.
#
# Build: docker build -t github-widgets .
# Run:   docker run -p 3000:3000 -e GITHUB_TOKEN=your_token github-widgets
# ============================================================================

# ============================================================================
# Stage 1: Dependencies
# ============================================================================
# Use Node.js 25 LTS Alpine for minimal size (Node 25+ required by package.json)
FROM node:25-alpine AS dependencies

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
# Copying these first allows Docker to cache this layer if dependencies don't change
COPY package*.json ./

# Install production dependencies only
# - npm ci: Clean install (faster and more reliable than npm install)
# - --only=production: Excludes devDependencies (netlify-cli not needed)
# - --ignore-scripts: Security best practice to prevent malicious scripts
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# ============================================================================
# Stage 2: Production Image
# ============================================================================
FROM node:25-alpine AS production

# Accept version as build argument
ARG VERSION=latest

# Add metadata labels
LABEL maintainer="Cyrus Mobini"
LABEL description="Production-ready GitHub Widgets SVG API server"
LABEL version="${VERSION}"
LABEL org.opencontainers.image.source="https://github.com/cyrus2281/github-widgets"
LABEL org.opencontainers.image.description="Standalone Express server for GitHub Widgets"
LABEL org.opencontainers.image.licenses="Apache-2.0"

# Install dumb-init for proper signal handling
# dumb-init ensures graceful shutdown and proper process management
RUN apk add --no-cache dumb-init

# Create non-root user for security
# Running as non-root is a security best practice
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy dependencies from dependencies stage
COPY --from=dependencies --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy application code
# Copy only necessary files for running the server
COPY --chown=nodejs:nodejs package*.json ./
COPY --chown=nodejs:nodejs server ./server
COPY --chown=nodejs:nodejs src ./src
COPY --chown=nodejs:nodejs public ./public

# Set environment variables
# NODE_ENV=production enables production optimizations
ENV NODE_ENV=production \
    PORT=3000

# Switch to non-root user
USER nodejs

# Expose the application port
EXPOSE 3000

# Health check configuration
# Docker will periodically check if the container is healthy
# - interval: Check every 30 seconds
# - timeout: Wait up to 3 seconds for response
# - start-period: Wait 10 seconds before first check (startup time)
# - retries: Mark unhealthy after 3 consecutive failures
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
# This ensures graceful shutdown works correctly in Docker
ENTRYPOINT ["dumb-init", "--"]

# Start the server
CMD ["node", "server/index.js"]
