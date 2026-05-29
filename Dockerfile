# Stage 1: Build Rust backend
FROM rust:1.96 AS rust-builder

WORKDIR /workspace

COPY . .

RUN cargo build --release

# Stage 2: Build the React and Express assets
FROM node:20-alpine AS node-builder

WORKDIR /workspace

# Install dependencies needed for compiling
COPY package.json package-lock.jso[n] ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copy application source files
COPY . .

# Run the build command (Vite client build & esbuild server compilation)
RUN npm run build

# Stage 3: Runtime image
FROM node:20-alpine

WORKDIR /workspace

# Install only production dependencies
COPY package.json package-lock.jso[n] ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

# Copy compiled build assets from node builder
COPY --from=node-builder /workspace/dist ./dist

# Copy Rust binary from rust builder
COPY --from=rust-builder /workspace/target/release/archweaver_server ./target/release/archweaver_server

# Expose port 3000 (Express) and 3001 (Rust backend)
EXPOSE 3000 3001

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Direct execution command
CMD ["npm", "run", "start"]
