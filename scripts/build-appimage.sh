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
# Run standalone Electron directly, forwarding all system commandline parameters (e.g., --no-sandbox)
exec "${HERE}/electron" "$@"
EOF
chmod +x "${APPDIR}/AppRun"

# 4. Create Desktop Entry
echo "==> Creating Desktop launcher description..."
cat << 'EOF' > "${APPDIR}/archforge.desktop"
[Desktop Entry]
Name=ArchForge
Exec=AppRun
Icon=archforge
Type=Application
Categories=System;Utility;
Comment=Bare-metal Arch Linux package and AUR repository manager.
Terminal=false
EOF

# 5. Fetch/Create Sleek AppIcon
echo "==> Fetching sleek packaging icon for ArchForge..."
curl -s -L -o "${APPDIR}/archforge.png" "https://cdn-icons-png.flaticon.com/512/5904/5904576.png" || {
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

echo "==> Generating standalone Electron Orchestrator and API pipeline..."
cat << 'EOF' > "${APPDIR}/resources/app/main.cjs"
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

// Spin up our embedded local Express backend server within the same container thread
const serverPath = path.join(__dirname, 'dist', 'server.cjs');
console.log('[Electron] Loading Express backend: ', serverPath);
require(serverPath);

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "ArchForge Manager",
    icon: path.join(__dirname, 'archforge.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Connect to the local Express server API and React UI
  win.loadURL('http://localhost:3000');

  // Hide traditional menu bar for clean modern window layout
  win.setMenuBarVisibility(false);

  // Delegate external HTTP references (such as AUR package websites) to the user's host web browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://localhost:3000') || url.startsWith('http://127.0.0.1:3000')) {
      return { action: 'allow' };
    }
    console.log('[Electron] Forwarding external URL to standard browser:', url);
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
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

echo "==> Compiling isolated production node-dependency subtree within payload..."
cd "${APPDIR}/resources/app"
npm install --omit=dev --no-audit --no-fund --legacy-peer-deps
cd "${PROJECT_DIR}"

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
