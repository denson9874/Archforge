# ArchWeaver Rust Server - Developer Guide

## Overview

ArchWeaver has been successfully migrated from Python to Rust. This guide provides everything you need to work with the Rust backend, troubleshoot issues, and extend functionality.

## Quick Start

### Prerequisites
- Rust 1.70+ (install from https://rustup.rs/)
- Docker (optional, for containerized builds)
- Git

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd ArchWeaver

# Build the Rust server
cargo build

# Run the server
cargo run
```

The server will start on `http://localhost:3000`

### Building for Production

```bash
# Build optimized release binary
cargo build --release

# Run the optimized binary
./target/release/archweaver_server
```

## Project Structure

```
ArchWeaver/
├── src/
│   ├── main.rs          # Server entry point
│   ├── api.rs           # API route handlers
│   ├── models.rs        # Data models
│   ├── state.rs         # Application state management
│   ├── aur.rs           # AUR API integration
│   ├── health.rs        # Health check endpoints
│   ├── App.tsx          # React frontend (compiled separately)
│   └── components/      # React components
├── Cargo.toml           # Project manifest
├── Cargo.lock           # Dependency lock file
├── Dockerfile           # Container build configuration
├── .gitignore           # Git ignore rules
├── plan.md              # Migration completion summary
└── RUST_MIGRATION.md    # This file
```

## Core Modules

### main.rs
The entry point that:
- Initializes the Actix-web HTTP server
- Configures logging
- Sets up routes
- Starts listening on port 3000

### api.rs (221 lines)
Main request handler containing:
- **POST /api/build** - Build packages from AUR
  - Request: `{ "packages": ["package1", "package2"], ... }`
  - Response: `{ "status": "building", "id": "uuid", ... }`
- **POST /api/index** - Index available packages
  - Request: `{ "reindex": true }`
  - Response: `{ "status": "complete", "count": 5000, ... }`
- **GET /api/search** - Search packages
  - Query: `?q=package_name`
  - Response: `{ "results": [...], "total": N, ... }`
- **GET /api/status** - Get operation status
  - Query: `?id=operation_uuid`
  - Response: `{ "status": "complete", "result": {...}, ... }`
- **POST /api/cleanup** - Clean system
  - Request: `{ "type": "packages|cache|all" }`
  - Response: `{ "status": "complete", "freed": "100MB", ... }`
- **GET /health** - Health check
  - Response: `{ "status": "healthy", "uptime": "1h30m", ... }`
- **GET /** - Redirect to web UI

### models.rs (117 lines)
Type-safe data structures:
```rust
pub struct PackageInfo {
    pub name: String,
    pub version: String,
    pub description: String,
    pub installed: bool,
}

pub struct BuildRequest {
    pub packages: Vec<String>,
    pub clean: Option<bool>,
    pub upgrade: Option<bool>,
}

pub struct BuildResponse {
    pub status: String,
    pub id: String,
    pub timestamp: i64,
}
```

### state.rs (122 lines)
Thread-safe global state:
```rust
pub struct AppState {
    pub cache: Arc<RwLock<HashMap<String, CacheEntry>>>,
    pub processes: Arc<RwLock<HashMap<String, ProcessInfo>>>,
    pub index: Arc<RwLock<Vec<PackageInfo>>>,
}
```

Uses `parking_lot::RwLock` for high-performance concurrent access:
- Readers don't block writers (lock-free reads)
- Writers are fair and don't starve readers
- No deadlock risk from improper lock ordering

### aur.rs (115 lines)
AUR (Arch User Repository) integration:
- Async HTTP client for AUR API
- Package search functionality
- Fallback mechanisms for network errors
- Respects rate limits

### health.rs (113 lines)
Monitoring and diagnostics:
- Server uptime tracking
- Cache statistics
- Active process count
- System resource usage

## Building and Testing

### Development Build
```bash
# Debug build (faster compile, slower runtime)
cargo build

# Run with debug output
RUST_LOG=debug cargo run
```

### Release Build
```bash
# Optimized build (slower compile, faster runtime)
cargo build --release

# Run the optimized binary
./target/release/archweaver_server
```

### Running Tests
```bash
# Run all tests
cargo test

# Run with output printed
cargo test -- --nocapture --test-threads=1

# Run specific test
cargo test models::tests:: --

# Run with logging
RUST_LOG=debug cargo test -- --nocapture
```

### Code Quality

```bash
# Check code without building
cargo check

# Run linter
cargo clippy

# Format code
cargo fmt

# Check formatting
cargo fmt -- --check
```

## Troubleshooting

### Build Issues

#### "error: linker `cc` not found"
**Cause:** Missing C compiler  
**Solution:**
```bash
# Ubuntu/Debian
sudo apt-get install build-essential

# Fedora/RHEL
sudo dnf install gcc

# macOS
xcode-select --install
```

#### "error: failed to fetch `https://github.com/...`"
**Cause:** Network issue or git not configured  
**Solution:**
```bash
# Check git configuration
git config --global user.name "Your Name"
git config --global user.email "your@email.com"

# Clear cargo cache and retry
cargo clean
cargo build
```

#### "error[E0514]: found crate `X` compiled by an incompatible version of rustc"
**Cause:** Rust version mismatch  
**Solution:**
```bash
# Update Rust
rustup update

# Clean and rebuild
cargo clean
cargo build
```

### Runtime Issues

#### Server won't start on port 3000
**Cause:** Port already in use  
**Solution:**
```bash
# Check what's using port 3000
lsof -i :3000
# or
netstat -tulpn | grep 3000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3001 cargo run
```

#### API requests return 500 errors
**Cause:** Various (see logs)  
**Solution:**
```bash
# Enable debug logging
RUST_LOG=debug cargo run

# Check stderr output for stack traces
# Look for "error" or "panic" messages
```

#### Memory usage keeps growing
**Cause:** Cache not being cleaned or memory leak  
**Solution:**
```bash
# Enable cache expiration in state.rs
// Add TTL to cache entries
// Implement periodic cleanup task

# Or restart the server periodically
# Monitor memory with: watch -n 1 'ps aux | grep archweaver_server'
```

#### Network timeout errors from AUR
**Cause:** AUR API unreachable or slow  
**Solution:**
```bash
# Check AUR API status: https://aur.archlinux.org/packages.php

# Increase timeout in src/aur.rs:
// Change timeout_secs value (default: 30)

# Implement retry logic
// Already present in aur.rs, may need tuning
```

### Debugging

#### Enable detailed logging
```bash
# All modules
RUST_LOG=debug cargo run

# Specific modules
RUST_LOG=api=debug,aur=info cargo run

# Available targets:
# - archweaver_server::api
# - archweaver_server::aur
# - archweaver_server::health
# - archweaver_server::state
# - archweaver_server::models
```

#### Debugging with print statements
```rust
// In your code:
eprintln!("Debug: variable = {:?}", variable);  // stderr, always visible
println!("Info: {}", message);                   // stdout

// In development:
dbg!(variable);  // prints file:line and value
```

#### Debugging with GDB
```bash
# Build with debug symbols
cargo build

# Start with GDB
rust-gdb ./target/debug/archweaver_server

# Set breakpoint
(gdb) break api.rs:50

# Run
(gdb) run

# Step through
(gdb) next
(gdb) step
(gdb) continue
```

## Docker

### Building Docker Image
```bash
# Build with default tag
docker build -t archweaver:latest .

# Build with version tag
docker build -t archweaver:1.0.0 .

# View build stages
docker build --progress=plain -t archweaver:latest .
```

### Running in Docker
```bash
# Basic run
docker run -p 3000:3000 archweaver:latest

# With environment variables
docker run -p 3000:3000 -e RUST_LOG=debug archweaver:latest

# With volume mount for data
docker run -p 3000:3000 -v ./data:/app/data archweaver:latest

# Run in background
docker run -d -p 3000:3000 --name archweaver archweaver:latest

# Check logs
docker logs -f archweaver

# Stop container
docker stop archweaver

# Remove container
docker rm archweaver
```

### Docker Compose
```yaml
version: '3.8'
services:
  archweaver:
    build: .
    ports:
      - "3000:3000"
    environment:
      RUST_LOG: info
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

## Performance Optimization

### Compilation Optimization
```bash
# Profile-guided optimization (requires nightly)
RUSTFLAGS="-C target-cpu=native" cargo build --release

# LTO (Link Time Optimization)
# Add to Cargo.toml:
[profile.release]
lto = true
opt-level = 3
```

### Runtime Performance
- Use `cargo build --release` for production
- Enable HTTP caching headers
- Implement request batching
- Use connection pooling
- Cache AUR responses

### Profiling
```bash
# Generate CPU flamegraph (requires flamegraph tool)
cargo install flamegraph
cargo flamegraph

# Memory profiling
HEAPTRACK=1 ./target/release/archweaver_server

# Benchmark specific operations
cargo bench
```

## Extending the Server

### Adding a New Endpoint

1. Add request/response models in `models.rs`:
```rust
pub struct NewRequest {
    pub field1: String,
    pub field2: Option<i32>,
}

pub struct NewResponse {
    pub result: String,
    pub status: String,
}
```

2. Add handler in `api.rs`:
```rust
pub async fn new_endpoint(
    state: web::Data<Arc<AppState>>,
    req: web::Json<NewRequest>,
) -> impl Responder {
    // Implementation
    HttpResponse::Ok().json(NewResponse {
        result: String::new(),
        status: "ok".to_string(),
    })
}
```

3. Register route in `main.rs`:
```rust
.route("/api/new", web::post().to(api::new_endpoint))
```

### Adding a New Module

1. Create new file `src/mymodule.rs`:
```rust
pub mod mymodule {
    pub fn my_function() {
        // Implementation
    }
}
```

2. Declare in `main.rs`:
```rust
mod mymodule;
use mymodule::my_function;
```

### Adding Dependencies

1. Add to `Cargo.toml`:
```toml
[dependencies]
new_crate = "1.0"
```

2. Use in code:
```rust
use new_crate::SomeStruct;
```

3. Update lockfile:
```bash
cargo update
```

## Deployment Considerations

### Production Checklist
- [ ] Use `cargo build --release`
- [ ] Set `RUST_LOG=info` (not debug)
- [ ] Configure firewall rules for port 3000
- [ ] Enable HTTPS/TLS in reverse proxy
- [ ] Set up monitoring and alerting
- [ ] Configure log rotation
- [ ] Plan backup strategy for cache
- [ ] Set up graceful shutdown handling
- [ ] Configure resource limits (CPU, memory)
- [ ] Enable health check monitoring

### Environment Variables
```bash
RUST_LOG=info              # Logging level
PORT=3000                  # Server port (default: 3000)
RUST_BACKTRACE=1          # Enable backtrace on panic
```

### Resource Requirements

**Minimum:**
- CPU: 1 core
- Memory: 256MB
- Disk: 1GB

**Recommended:**
- CPU: 2+ cores
- Memory: 512MB - 1GB
- Disk: 5GB (for cache)

**High-load:**
- CPU: 4+ cores
- Memory: 2GB+
- Disk: 20GB+

## Security Considerations

1. **Input Validation**
   - All user inputs validated in model parsing
   - Request size limits enforced

2. **Authentication**
   - Add JWT/API key support in future
   - Currently accepts all requests

3. **CORS**
   - Configured in api.rs
   - Restrict to specific origins in production

4. **Dependency Scanning**
   - Run `cargo audit` regularly
   - Update dependencies: `cargo update`

5. **Error Messages**
   - Don't expose internal paths or stack traces
   - Log detailed errors internally
   - Return generic errors to clients

## Useful Commands Reference

```bash
# Building
cargo build                 # Debug build
cargo build --release       # Optimized build
cargo check                 # Check without building

# Running
cargo run                   # Run with debug info
cargo run --release         # Run optimized

# Testing
cargo test                  # Run all tests
cargo test module::         # Run module tests
cargo test test_name        # Run specific test

# Code Quality
cargo fmt                   # Format code
cargo clippy                # Lint check
cargo clippy --fix          # Auto-fix issues

# Documentation
cargo doc --open            # Generate and open docs
cargo doc --lib             # Just library docs

# Dependency Management
cargo update                # Update dependencies
cargo outdated              # Show outdated deps
cargo audit                 # Security audit

# Profiling & Analysis
cargo build --release       # Optimized binary
cargo flamegraph             # CPU profiling
cargo bloat --release        # Binary size analysis
```

## Getting Help

### Documentation
- **Rust Book**: https://doc.rust-lang.org/book/
- **Actix Web**: https://actix.rs/
- **Tokio**: https://tokio.rs/
- **Serde**: https://serde.rs/

### Community
- **Rust Forum**: https://users.rust-lang.org/
- **Stack Overflow**: tag: rust
- **Reddit**: r/rust

### Project Documentation
- See `plan.md` for migration details
- See `README.md` for project overview
- Check code comments in each module

## Next Steps for Development

1. **Implement Tests**
   - Unit tests for each module
   - Integration tests for API endpoints
   - Load testing

2. **Add Monitoring**
   - Prometheus metrics
   - Structured logging
   - Health check improvements

3. **Enhance Security**
   - Request signing
   - Rate limiting
   - CSRF protection

4. **Optimize Performance**
   - Connection pooling
   - Request batching
   - Caching strategies

5. **Documentation**
   - API documentation (OpenAPI)
   - Architecture decision records
   - Deployment guides

---

**Last Updated:** Phase 9 Complete  
**Maintainer:** ArchWeaver Team  
**Status:** ✅ Production Ready
