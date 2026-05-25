<div align="center">
</div>

# Welcome to ArchForge: Your One Stop Shop for all AUR package Management

ArchForge, an interactive, full-stack visual management console and live build simulator for the Arch Linux AUR and system-wide package repositories.
The application is deployed as a highly functional, responsive dashboard on an Express + Vite server proxy, enabling real-time connection to the genuine Arch Linux AUR RPC API.

🌟 Key Features & Architecture

Real-Time AUR Database Proxy & Fetcher: Integrates directly with the public aur.archlinux.org RPC endpoint to search packages, display statistics/votes/popularity, and scrape complete PKGBUILD compiler instructions securely without browser CORS issues.

Interactive Sandbox Compile & Live Build Logs: Features an authentic makepkg pipeline simulator. When choosing to compile any package, it triggers a live terminal console showing dependency resolution, source retrievals, SHA256 checksum validations, source patching, C++ multi-thread compiler logs, and Pacman database registrations.

Clean Sandbox Dependency Tree Solver: Interrogates package definitions to automatically graph make-time and run-time dependencies into an elegant, visual hierarchical tree.

System Health Monitor Widgets: Displays real-time gauges of system package integrity (checks for broken dependencies or library errors), CPU usage rates, active memory limits, and pending system updates.

CACHED Package Version Rollback: Allows power-users to inspect previous system compilation histories and securely roll back unstable software packages to earlier cached builds.

Advanced Power-User CLI (Terminal Shell): Includes a command-line interface supporting standard commands (yay -S, yay -Syu, yay -Ss, pacman -Q, pacman -Qi, pacman -R, and clear). Inputting commands into the terminal actively interacts with and modifies the visual state of the database.

Cosmic Slate Styling & Transitions: Styled with standard, crisp slate tones, glowing border overlays, clean display typography pairings (Inter and JetBrains Mono), and responsive panel transitions using motion/react.

## Run Locally

**Prerequisites:** Node.js

Depending on how you exported or cloned this project (e.g., as a ZIP or GitHub repo), the codebase containing `package.json` may be located inside a subdirectory under your main folder (such as `react-example` or similar).

1. **Navigate to the directory containing `package.json`:**
   Check your directory listing first. If you don't see `package.json` in your current folder, find the subdirectory containing it and change directory:
   ```bash
   # List files to check where package.json is
   ls -la
   
   # Go into the project subdirectory containing package.json (e.g., react-example or similar)
   cd <project-directory-name>
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the app bare-metal (Direct real-time Arch interactions enabled):**
   ```bash
   # Development server
   npm run dev

   # Or run directly in Desktop mode
   npm run desktop
   ```
   
   ⚠️ **Sudo Permission Notice:**
   When installing packages or running system upgrades, the under-the-hood `pacman` / `makepkg` toolchain may require administrator (`sudo`) privileges. Since authorization occurs within the background host process, **you must enter your administrator password in the terminal window used to launch the app** if prompted. Check your active console to authorize!

## Run via Docker

You can also package and run the application inside a multi-stage Alpine-based Docker container.

**Prerequisites:** Docker installed on your host machine.

1. **Build the Docker Image:**
   ```bash
   docker build -t archforge .
   ```

2. **Run the Containerized Application:**
   ```bash
   docker run -p 3000:3000 archforge
   ```

Once started, the application will be accessible inside your browser at `http://localhost:3000`.
