<div align="center">
  <img src="public/archweaver_logo.svg" alt="ArchWeaver Logo" width="160" height="160" />
  <h1>ArchWeaver</h1>
  <p><strong>Your One-Stop Shop for AUR and Arch Linux Package Management</strong></p>
</div>

ArchWeaver is an interactive, full-stack visual management console and live build simulator for the Arch Linux AUR and system-wide package repositories.
The application operates as a highly responsive dashboard powered by an Express/Node static server proxying a custom **Rust** background REST API, enabling real-time secure communication with the standard Arch Linux AUR RPC API.

🌟 Key Features & Architecture

- **Real-Time AUR Database Proxy**: Connects directly to the public aur.archlinux.org RPC API to execute searches, fetch votes, track popularity curves, and automatically resolve transitive dependencies.
- **Interactive Sandbox & Makepkg Build Simulator**: Runs a realistic mock build pipeline visualization that logs dependency resolutions, source retrievals, SHA256 integrity checks, and native compile routines step-by-step inside the visual CLI terminal.
- **Dynamic Dependency Graphs**: Intellectually scans package files to build visual trees mapping make-time vs run-time dependencies.
- **System Health Monitor Widgets**: Displays real-time charts capturing CPU metrics, running processes, memory limits, and pending database package updates.
- **CACHED Package Version Rollback**: Allows power-users to inspect previous system compilation histories and securely roll back unstable software packages to earlier cached builds.
- **Power-User CLI Dashboard (Terminal Mode)**: Hosts a functional sandboxed shell supporting standard syntax (`yay -S`, `yay -Syu`, `pacman -R`, and others) that synchronously updates the underlying database index.
- **Cosmic Slate Aesthetics**: Features an immersive high-contrast twilight visual theme utilizing Inter and JetBrains Mono typography, custom animations, and clean responsive layouts.

---

## 🚀 Running via Standalone AppImage

The easiest way to run stable **ArchWeaver** as a client on any modern Linux environment without pre-installing runtime servers is to compile or execute the native, self-contained **AppImage**.

### 1. Build the Desktop AppImage

Ensure you have NPM and internet access available on your build machine (on Arch Linux: `sudo pacman -S --needed npm curl tar xz unzip`). Run the automated builder script:

```bash
# Grant execution rights to the packager
chmod +x ./scripts/build-appimage.sh

# Run the packager to build the standalone AppImage
./scripts/build-appimage.sh
```

This automates the following steps:
1. Compiles the modern React assets in production mode.
2. Bundles the custom background Python server.
3. Retrieves and sets up a stable, isolated Electron GUI wrapper.
4. Generates a standalone, double-clickable `ArchWeaver-x86_64.AppImage` executable.

### 2. Execute the AppImage

After compiling, the file `ArchWeaver-x86_64.AppImage` will appear in the directory root. To execute:

```bash
# Grant execution rights to the AppImage
chmod +x ArchWeaver-x86_64.AppImage

# Launch the standalone desktop application
./ArchWeaver-x86_64.AppImage
```

> 💡 **Auto Desktop Shortcut/Menu Integration:**
> On its very first run, the AppImage automatically integrates itself into your host's local system directories (`~/.local/bin` and `~/.local/share/applications/`), adding a fully styled launcher icon to your system menus so you can boot ArchWeaver directly from your application dashboard at any time.

---

## 🛠️ Developer Local Manual Setup (Bare-Metal Mod Mode)

If you are developing or editing ArchWeaver itself, you can run the UI dev-server and API backend side-by-side using Node and Rust:

### 1. Install Dependencies

**Node.js & npm packages:**
```bash
# Install NPM packaging modules and packages
npm install
```

**Rust toolchain (required for backend):**
```bash
# Install Rust using rustup (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Then in your shell:
source $HOME/.cargo/env
```

### 2. Build Rust Backend

```bash
# Build the Rust backend (debug mode for development)
cargo build

# Or build the optimized release version
cargo build --release
```

### 3. Start the Application

Run the bare-metal development pipeline with Rust backend and direct Arch/AUR mock services:

```bash
# Terminal 1: Start the Rust backend (if not auto-started)
./target/debug/archweaver_server

# Terminal 2 (separate terminal): Start Vite development server
npm run dev
```

ℹ️ **Automatic Backend Startup**: When you run `npm run dev`, the Express server will automatically spawn the Rust backend if the binary exists.

⚠️ **Sudo Permission Notice:**
When running pacman integrity queries or packages, the under-the-hood Makepkg and helper scripts may request `sudo` permissions. Ensure that you enter your password when requested in the terminal launcher.

---

## 🐳 Running via Containerized Docker

You can also package and run the application inside a multi-stage Alpine-based Docker container.

### 1. Build the Docker Image:
```bash
docker build -t archweaver .
```

### 2. Run the Containerized Application:
```bash
docker run -p 3000:3000 archweaver
```

Once started, the application will be accessible inside your browser at `http://localhost:3000`.

## Tauri

You can run the desktop app in development with the Vite dev server using:

  npm run tauri:dev

Build the native bundle with:

  npm run tauri:build

(Requires @tauri-apps/cli installed globally or as a dev dependency.)
