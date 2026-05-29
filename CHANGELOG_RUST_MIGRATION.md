# Changelog: Python to Rust Migration

This changelog summarizes the work completed to move ArchWeaver's backend path from the previous Python/server-oriented implementation toward a Rust-backed architecture.

## Migration Summary

- Replaced the backend core with a Rust Actix-web service.
- Added typed Rust models for request and response payloads.
- Added Rust modules for API routing, AUR search, system health, and shared application state.
- Updated local development, Docker, and documentation so the app can build and run the Rust backend.
- Kept legacy Python/Node paths available where still needed for compatibility and packaging.

## Added

### Rust Backend Project

- Added root-level Rust project files:
  - `Cargo.toml`
  - `Cargo.lock`
- Added the Rust server binary target:
  - Binary name: `archweaver_server`
  - Entry point: `src/main.rs`
  - Default bind address: `0.0.0.0:3001`
- Added production dependencies for the backend:
  - `actix-web`
  - `actix-rt`
  - `tokio`
  - `serde`
  - `serde_json`
  - `parking_lot`
  - `chrono`
  - `tempfile`
  - `regex`
  - `reqwest`
  - `futures`
  - `log`
  - `env_logger`
  - `uuid`
- Added test dependency:
  - `tokio-test`

### Rust Modules

- Added `src/main.rs`:
  - Initializes logging.
  - Creates shared application state.
  - Starts the Actix-web HTTP server.
  - Registers API routes.
- Added `src/api.rs`:
  - Defines HTTP routes under `/api`.
  - Implements package search, package detail lookup, build simulation, system health, install, upgrade, remove, and suggestion handlers.
  - Serializes all responses as JSON.
- Added `src/models.rs`:
  - Defines typed request and response models for package data, build simulation, system health, package operations, errors, and process tracking.
- Added `src/state.rs`:
  - Defines shared application state.
  - Uses `parking_lot::RwLock` for thread-safe concurrent access.
  - Tracks AUR package index data, cached packages, active processes, and indexing timestamps.
- Added `src/aur.rs`:
  - Implements AUR package search and package lookup logic.
  - Adds result scoring and suggestions.
  - Seeds initial package data for local operation.
- Added `src/health.rs`:
  - Collects system health data from `/proc`.
  - Reports CPU usage, memory usage, process count, and timestamps.

### Documentation

- Added `RUST_MIGRATION.md`:
  - Developer guide for the Rust backend.
  - Build, run, test, troubleshoot, and deployment notes.
- Added `plan.md`:
  - Migration completion summary.
  - Lists migration phases, module responsibilities, verification status, and follow-up recommendations.
- Updated `README.md`:
  - Describes the app as using a Rust background REST API.
  - Adds Rust toolchain setup instructions.
  - Adds Rust backend build commands.
  - Documents running the Rust backend alongside the Vite/Node development server.
  - Notes that the Express server can spawn the Rust backend when the binary exists.

## Changed

### Backend Runtime Architecture

- Changed the backend model from Python-centered runtime behavior to a Rust service model.
- Moved backend API responsibilities into a compiled Rust server running on port `3001`.
- Left the Node/Express server on port `3000` to serve the frontend and proxy selected API traffic to the Rust backend.
- Added `RUST_BACKEND_URL` support through the Express proxy path, defaulting to `http://localhost:3001`.

### Express/Node Integration

- Updated `server.ts` to proxy selected routes to the Rust backend:
  - `/api/search`
  - `/api/package`
  - `/api/build`
  - `/api/system-health`
- Updated `server.ts` to auto-detect and spawn a Rust backend binary:
  - Development binary: `target/debug/archweaver_server`
  - Release binary: `target/release/archweaver_server`
- Added logging for spawned Rust backend stdout/stderr.
- Kept fallback behavior when the Rust backend binary is not present.

### Build Scripts

- Updated `package.json` scripts to include Rust-aware commands:
  - `build` now runs a Rust release build as part of the application build path.
  - `clean` now removes frontend output and cleans Rust build artifacts.
  - `local` builds the web app and runs the Tauri/Rust manifest path.
- Added separate `build:web` script so web-only builds can avoid compiling native desktop/Rust artifacts when needed.

### Docker Build

- Updated `Dockerfile` with a Rust build stage:
  - Uses a Rust builder image.
  - Runs `cargo build --release`.
  - Copies `target/release/archweaver_server` into the runtime image.
- Exposes both app and Rust backend ports:
  - `3000` for Express/web.
  - `3001` for the Rust backend.
- Adjusted the Node build stage to build only web/server assets instead of invoking the full native desktop build.

### CI Build Support

- Updated GitHub Actions workflows to install native Linux dependencies required by Rust/Tauri builds:
  - `pkg-config`
  - `libglib2.0-dev`
  - `libgtk-3-dev`
  - `libwebkit2gtk-4.1-dev`
  - `libayatana-appindicator3-dev`
  - `librsvg2-dev`
  - `libxdo-dev`
  - `patchelf`
  - standard build tools
- This addresses the `glib-2.0.pc` / `glib-sys` build failure on Ubuntu runners.

### TypeScript Project Scope

- Updated `tsconfig.json` to exclude generated Rust/Tauri build outputs:
  - `target`
  - `src-tauri/target`
  - `dist`
- This prevents `tsc` from parsing generated binary-like JavaScript assets created during native builds.

## Preserved

- Preserved the existing frontend React application.
- Preserved Node/Express runtime behavior where still needed for frontend serving, proxying, AppImage support, and compatibility fallback paths.
- Removed `server.py` from AppImage packaging and replaced legacy Python startup with node-based server bootstrap.
- Preserved existing package-management behavior such as cleanup, install/remove flows, AUR simulation, and system interaction paths where they still live outside the Rust backend.

## Verified

- Rust modules compile successfully.
- TypeScript checks pass after excluding generated native build artifacts.
- Web build succeeds with Vite.
- Rust backend documentation and migration summary were added.
- GitHub Actions were updated to install the system libraries needed for Linux Rust/Tauri builds.

## Follow-Up Work

- Continue moving remaining Node/legacy backend endpoints into Rust until the Express server is only a static/proxy layer or can be removed.
- Removed `server.py` and packaging references as part of the Rust migration.
- Add Rust integration tests for each proxied endpoint.
- Replace seeded/mock AUR data with broader live AUR indexing and persistent cache storage.
- Add a health check from the Express layer to the Rust backend so startup can fail fast when the Rust service is unavailable.
