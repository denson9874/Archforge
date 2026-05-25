# Stage 1: Build the React and Express assets
FROM node:20-alpine AS builder

WORKDIR /workspace

# Install dependencies needed for compiling
COPY package.json package-lock.jso[n] ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copy application source files
COPY . .

# Run the build command (Vite client build & esbuild server compilation)
RUN npm run build

# Stage 2: Runtime image
FROM node:20-alpine

WORKDIR /workspace

# Install only production dependencies
COPY package.json package-lock.jso[n] ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

# Copy compiled build assets from builder
COPY --from=builder /workspace/dist ./dist

# Expose port 3000 (standard ingress port for the applet)
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Direct execution command
CMD ["npm", "run", "start"]
