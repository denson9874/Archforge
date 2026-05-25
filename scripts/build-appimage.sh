#!/bin/bash
set -e

# Directories
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="${PROJECT_DIR}/build-appimage"
APPDIR="${BUILD_DIR}/ArchForge.AppDir"

# 0. Verify Build System Environment Dependencies
echo "==> Verifying core AppImage builder toolchain..."
MISSING_BUILD_TOOLS=()
for tool in npm curl tar xz unzip; do
  if ! command -v "$tool" &> /dev/null; then
    MISSING_BUILD_TOOLS+=("$tool")
  fi
done

if [ ${#MISSING_BUILD_TOOLS[@]} -ne 0 ]; then
  echo "=========================================================="
  echo "❌ ERROR: Missing required compilation tools: ${MISSING_BUILD_TOOLS[*]}"
  echo "💡 To compile the standalone AppImage, your system must have these utilities."
  echo "👉 On Arch Linux: sudo pacman -S --needed npm curl tar xz unzip"
  echo "👉 On Debian/Ubuntu: sudo apt-get install -y npm curl tar xz-utils unzip"
  echo "=========================================================="
  exit 1
fi

echo "==> Heading to project root: ${PROJECT_DIR}"
cd "${PROJECT_DIR}"

# 1. Build the production React and Node distribution
echo "==> Initiating standard clean-build for ArchForge..."
npm run clean || true
npm run build

# 2. Re-create workspace directories
echo "==> Rebuilding packaging workspace..."
rm -rf "${BUILD_DIR}"
mkdir -p "${APPDIR}/resources/app"

# 3. Create Custom AppRun script inside AppDir
echo "==> Creating custom AppRun entry point binary..."
cat << 'EOF' > "${APPDIR}/AppRun"
#!/bin/bash
HERE="$(dirname "$(readlink -f "${0}")")"
# Run standalone Electron directly, forwarding ozone native flags and forwarding all system user parameters
exec "${HERE}/electron" --ozone-platform-hint=auto --enable-features=WaylandWindowDecorations,WebRTCPipeWireCapturer "$@"
EOF
chmod +x "${APPDIR}/AppRun"

# 4. Create Desktop Entry
echo "==> Creating Desktop launcher description..."
cat << 'EOF' > "${APPDIR}/archforge.desktop"
[Desktop Entry]
Type=Application
Name=ArchForge Manager
Exec=AppRun --ozone-platform-hint=auto --enable-features=WaylandWindowDecorations,WebRTCPipeWireCapturer --no-sandbox %U
Icon=archforge
Comment=Bare-metal Arch Linux package and AUR repository manager
Categories=System;Utility;Settings;PackageManager;
Terminal=false
StartupWMClass=ArchForge
EOF

# 5. Fetch/Create Sleek AppIcon
echo "==> Fetching sleek packaging icon for ArchForge..."
curl -s -L -o "${APPDIR}/archforge.png" "https://cdn-icons-png.flaticon.com/512/9356/9356230.png" || {
  echo "⚠️ Failed downloading icon from backup Flaticon CDN; generating a fallback visual placeholder instead..."
  touch "${APPDIR}/archforge.png"
}

# 6. Fetch/Unpack Electron Standalone GUI Engine
echo "==> Fetching precompiled, stable Electron x64 framework..."
ELECTRON_VERSION="30.0.0"
ELECTRON_ZIP="electron-v${ELECTRON_VERSION}-linux-x64.zip"
curl -s -S -f -L -o "${BUILD_DIR}/${ELECTRON_ZIP}" "https://github.com/electron/electron/releases/download/v${ELECTRON_VERSION}/${ELECTRON_ZIP}"

echo "==> Deploying standalone GUI shell..."
unzip -q "${BUILD_DIR}/${ELECTRON_ZIP}" -d "${APPDIR}"
rm -f "${BUILD_DIR}/${ELECTRON_ZIP}"

# Grant execution rights to main framework launch routines and helpers
chmod +x "${APPDIR}/electron"
if [ -f "${APPDIR}/chrome-sandbox" ]; then
  chmod 4755 "${APPDIR}/chrome-sandbox" || chmod +x "${APPDIR}/chrome-sandbox"
fi

# Remove default Electron splash screen archive so it evaluates our application main process instead
rm -f "${APPDIR}/resources/default_app.asar"

# 7. Isolate production payload and install clean NPM dependencies
echo "==> Bundling full-stack production build assets into payload..."
cp -r dist "${APPDIR}/resources/app/"
cp package.json "${APPDIR}/resources/app/"
cp server.py "${APPDIR}/resources/app/"

echo "==> Generating standalone Electron Orchestrator and API pipeline..."
cat << 'EOF' > "${APPDIR}/resources/app/main.cjs"
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const { execSync } = require('child_process');

// 1. Force production environment immediately to prevent Vite loading in server.cjs
process.env.NODE_ENV = 'production';

// 2. Automated Bare-Metal Self-Installation/Desktop Integration (Like Chrome on Linux)
function performDesktopIntegration() {
  const isAppImage = !!process.env.APPIMAGE;
  const currentBinary = process.env.APPIMAGE || process.execPath;
  const homeDir = os.homedir();
  const binDir = path.join(homeDir, '.local', 'bin');
  const targetAppPath = path.join(binDir, 'archforge');
  const applicationsDir = path.join(homeDir, '.local', 'share', 'applications');
  const desktopFilePath = path.join(applicationsDir, 'archforge.desktop');
  const iconDir = path.join(homeDir, '.local', 'share', 'icons');
  const iconPath = path.join(iconDir, 'archforge.png');

  try {
    fs.mkdirSync(binDir, { recursive: true });
    fs.mkdirSync(applicationsDir, { recursive: true });
    fs.mkdirSync(iconDir, { recursive: true });

    // Copy our AppImage executable to the standard consumer binary directory
    if (isAppImage && currentBinary !== targetAppPath) {
      console.log(`[ArchForge Self-Installer] Propagating binary to ${targetAppPath}...`);
      fs.copyFileSync(currentBinary, targetAppPath);
      fs.chmodSync(targetAppPath, 0o755);
    }

    // Try copying or writing our core launcher icon
    const embeddedIcon = path.join(__dirname, 'archforge.png');
    if (fs.existsSync(embeddedIcon)) {
      fs.copyFileSync(embeddedIcon, iconPath);
      const iconPathsToPopulate = [
        path.join(homeDir, ".icons", "archforge.png"),
        path.join(homeDir, ".local/share/icons/hicolor/48x48/apps/archforge.png"),
        path.join(homeDir, ".local/share/icons/hicolor/256x256/apps/archforge.png"),
        path.join(homeDir, ".local/share/icons/hicolor/512x512/apps/archforge.png"),
      ];
      for (const p of iconPathsToPopulate) {
        try {
          fs.mkdirSync(path.dirname(p), { recursive: true });
          fs.copyFileSync(embeddedIcon, p);
        } catch (_) {}
      }
      try {
        execSync(`gtk-update-icon-cache -f ${path.join(homeDir, ".local/share/icons/hicolor")}`, { stdio: 'ignore' });
        execSync(`gtk-update-icon-cache -f ${path.join(homeDir, ".icons")}`, { stdio: 'ignore' });
      } catch (_) {}
    }

    const execCmd = isAppImage ? targetAppPath : currentBinary;
    const desktopTemplate = `[Desktop Entry]
Type=Application
Name=ArchForge Manager
Exec=${execCmd} --ozone-platform-hint=auto --enable-features=WaylandWindowDecorations,WebRTCPipeWireCapturer --no-sandbox %U
Icon=${iconPath}
Comment=Bare-metal Arch Linux package and AUR repository manager
Categories=System;Utility;Settings;PackageManager;
Terminal=false
StartupWMClass=ArchForge
`;

    fs.writeFileSync(desktopFilePath, desktopTemplate, 'utf8');
    
    // Refresh the Linux system desktop launcher cache database
    try {
      execSync(`update-desktop-database ${applicationsDir}`, { stdio: 'ignore' });
    } catch {}
    console.log('[ArchForge Self-Installer] Native desktop configuration established successfully!');
  } catch (err) {
    console.error('[ArchForge Self-Installer] Integration failed:', err);
  }
}

// 3. Launch embedded Python REST and static file server asynchronously
const { spawn } = require('child_process');
const serverPath = path.join(__dirname, 'server.py');
console.log('[Electron Core] Spawning Python core database server:', serverPath);

const pythonProcess = spawn('python3', [serverPath], {
  env: { ...process.env, PORT: '3000' },
  stdio: 'inherit'
});

pythonProcess.on('error', (err) => {
  console.error('[Electron Core] Critical: Failed to spawn Python database server:', err);
});

// Ensure python process is killed when Electron main loop exits or quits
app.on('will-quit', () => {
  console.log('[Electron Core] Stopping Python core database server...');
  pythonProcess.kill();
});
process.on('exit', () => {
  pythonProcess.kill();
});

let mainWindow = null;
let splashWindow = null;

// HTML data URL for the elegant, dynamic boot splash screen
const SPLASH_HTML = `
<html>
  <head>
    <title>ArchForge</title>
    <style>
      body {
        background-color: #0c0a09;
        color: #f5f5f4;
        font-family: system-ui, -apple-system, sans-serif;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        margin: 0;
        overflow: hidden;
        user-select: none;
      }
      .logo-container {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 28px;
      }
      .pulse-ring {
        position: absolute;
        width: 80px;
        height: 80px;
        border: 2px solid #06b6d4;
        border-radius: 50%;
        animation: pulse 2s cubic-bezier(0.24, 0, 0.38, 1) infinite;
        opacity: 0.3;
      }
      @keyframes pulse {
        0% { transform: scale(0.8); opacity: 0.5; }
        100% { transform: scale(1.6); opacity: 0; }
      }
      .spinner {
        width: 48px;
        height: 48px;
        border: 3px solid rgba(6, 182, 212, 0.1);
        border-radius: 50%;
        border-top-color: #06b6d4;
        animation: spin 0.8s cubic-bezier(0.55, 0.085, 0.68, 0.53) infinite;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      h2 {
        font-size: 18px;
        font-weight: 800;
        letter-spacing: 0.15em;
        margin: 0;
        color: #ffffff;
        text-shadow: 0 0 10px rgba(6, 182, 212, 0.2);
      }
      .desc {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        font-size: 11px;
        color: #a8a29e;
        margin-top: 10px;
        opacity: 0.85;
      }
      .progress-dots {
        display: flex;
        gap: 6px;
        margin-top: 20px;
      }
      .dot {
        width: 5px;
        height: 5px;
        background-color: #44403c;
        border-radius: 50%;
        animation: dotPulse 1.4s ease-in-out infinite both;
      }
      .dot:nth-child(2) { animation-delay: 0.2s; }
      .dot:nth-child(3) { animation-delay: 0.4s; }
      @keyframes dotPulse {
        0%, 80%, 100% { transform: scale(0.8); opacity: 0.4; }
        40% { transform: scale(1.2); background-color: #06b6d4; opacity: 1; }
      }
    </style>
  </head>
  <body>
    <div class="logo-container">
      <div class="pulse-ring"></div>
      <div class="spinner"></div>
    </div>
    <h2>ARCHFORGE MANAGER</h2>
    <div id="status" class="desc">Booting secure core engine...</div>
    <div class="progress-dots">
      <div class="dot"></div>
      <div class="dot"></div>
      <div class="dot"></div>
    </div>
  </body>
</html>
`;

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 420,
    height: 320,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    center: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(SPLASH_HTML)}`);
  splashWindow.once('ready-to-show', () => {
    splashWindow.show();
  });
}

function createMainWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "ArchForge Manager",
    icon: path.join(__dirname, 'archforge.png'),
    show: false,
    backgroundColor: '#0c0a09',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadURL('http://localhost:' + port);

  mainWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
    }
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://localhost:') || url.startsWith('http://127.0.0.1:')) {
      return { action: 'allow' };
    }
    console.log('[Electron Native Router] Opening URL externally:', url);
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function pollLocalExpressServer(callback) {
  let attempts = 0;
  const maxAttempts = 100;
  const check = () => {
    attempts++;
    const port = global.archforgePort || 3000;
    const req = http.get(`http://localhost:${port}/api/system/stats`, (res) => {
      callback(true, port);
    });
    
    req.on('error', () => {
      if (attempts < maxAttempts) {
        setTimeout(check, 150);
      } else {
        callback(false, port);
      }
    });
  };
  check();
}

app.whenReady().then(() => {
  createSplashWindow();
  performDesktopIntegration();

  pollLocalExpressServer((success, resolvedPort) => {
    if (success) {
      createMainWindow(resolvedPort);
    } else {
      console.error('[Electron Core] Critical server connection timed out!');
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow(global.archforgePort || 3000);
    }
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
EOF

echo "==> Re-aligning package manifest entry points to target Electron main loop..."
node -e "
  const fs = require('fs');
  const pkg = JSON.parse(fs.readFileSync('${APPDIR}/resources/app/package.json', 'utf8'));
  pkg.main = 'main.cjs';
  fs.writeFileSync('${APPDIR}/resources/app/package.json', JSON.stringify(pkg, null, 2));
"

echo "==> AppImage is fully standalone: skipping nested npm installation inside packaging payload."

# 8. Package using appimagetool
echo "==> Fetching standalone appimagetool compiler..."
curl -s -S -f -L -o "${BUILD_DIR}/appimagetool" "https://github.com/AppImage/AppImageKit/releases/download/continuous/appimagetool-x86_64.AppImage"
chmod +x "${BUILD_DIR}/appimagetool"

echo "==> Constructing standalone, double-clickable AppImage executable..."
export ARCH=x86_64

# Extract appimagetool to bypass FUSE constraints in running containers/CI runners
echo "==> Extracting appimagetool to SquashFS-Root..."
cd "${BUILD_DIR}"
if ! ./appimagetool --appimage-extract; then
  echo "⚠️ appimagetool extraction failed, attempting direct execution..."
fi
cd "${PROJECT_DIR}"

if [ -f "${BUILD_DIR}/squashfs-root/AppRun" ]; then
  echo "==> Running extracted appimagetool binary directly..."
  if ! "${BUILD_DIR}/squashfs-root/AppRun" "${APPDIR}" "${PROJECT_DIR}/ArchForge-x86_64.AppImage"; then
    echo "❌ ERROR: AppImage packaging via extracted builder failed."
    exit 1
  fi
else
  echo "==> Fallback to extracting-and-running appimagetool directly..."
  if ! "${BUILD_DIR}/appimagetool" --appimage-extract-and-run "${APPDIR}" "${PROJECT_DIR}/ArchForge-x86_64.AppImage"; then
    echo "❌ ERROR: AppImage packaging execution failed."
    exit 1
  fi
fi

# Verify the output AppImage file exists
if [ ! -f "${PROJECT_DIR}/ArchForge-x86_64.AppImage" ]; then
  echo "❌ ERROR: Compilation finished but the output file ${PROJECT_DIR}/ArchForge-x86_64.AppImage was not found!"
  exit 1
fi

# Clean temp directory
rm -rf "${BUILD_DIR}"

echo "=========================================================="
echo "🎉 SUCCESS: Sandboxed build sequence finished!"
echo "🚀 Standalone AppImage Compiled!"
echo "📍 Find it at: ${PROJECT_DIR}/ArchForge-x86_64.AppImage"
echo "=========================================================="
