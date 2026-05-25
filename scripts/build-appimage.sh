#!/bin/bash
set -e

# Directories
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="${PROJECT_DIR}/build-appimage"
APPDIR="${BUILD_DIR}/ArchForge.AppDir"

# 0. Verify Build System Environment Dependencies
echo "==> Verifying core AppImage builder toolchain..."
MISSING_BUILD_TOOLS=()
for tool in npm curl tar xz; do
  if ! command -v "$tool" &> /dev/null; then
    MISSING_BUILD_TOOLS+=("$tool")
  fi
done

if [ ${#MISSING_BUILD_TOOLS[@]} -ne 0 ]; then
  echo "=========================================================="
  echo "❌ ERROR: Missing required compilation tools: ${MISSING_BUILD_TOOLS[*]}"
  echo "💡 To compile the standalone AppImage, your system must have these utilities."
  echo "👉 On Arch Linux: sudo pacman -S --needed npm curl tar xz"
  echo "👉 On Debian/Ubuntu: sudo apt-get install -y npm curl tar xz-utils"
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
mkdir -p "${APPDIR}/usr/bin"
mkdir -p "${APPDIR}/usr/share/archforge"

# 3. Create Custom AppRun script inside AppDir
echo "==> Creating custom AppRun entry point binary..."
cat << 'EOF' > "${APPDIR}/AppRun"
#!/bin/bash
HERE="$(dirname "$(readlink -f "${0}")")"
export PATH="${HERE}/usr/bin:${PATH}"

# Launch Node backend application in the background
"${HERE}/usr/bin/node" "${HERE}/usr/share/archforge/dist/server.cjs" --desktop &
SERVER_PID=$!

# Graceful cleanup handler on termination
trap 'kill $SERVER_PID 2>/dev/null' SIGINT SIGTERM EXIT

# Wait for backend server to become responsive, then monitor its status
sleep 1.2
wait $SERVER_PID
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
# Use a high-quality free terminal/forge icon from a fast public CDN repository
curl -s -L -o "${APPDIR}/archforge.png" "https://cdn-icons-png.flaticon.com/512/5904/5904576.png" || {
  echo "⚠️ Failed downloading icon from backup Flaticon CDN; generating a fallback visual placeholder instead..."
  # If offline, touch a fallback file
  touch "${APPDIR}/archforge.png"
}

# 6. Download Standalone Node.js Binary (v20 LTS for maximum hardware stability)
echo "==> Fetching precompiled, secure static Node.js LTS package..."
NODE_VERSION="v20.12.2"
NODE_TAR="node-${NODE_VERSION}-linux-x64.tar.xz"
curl -s -S -f -L -O "https://nodejs.org/dist/${NODE_VERSION}/${NODE_TAR}"

echo "==> Unpacking and binding server executable..."
tar -xf "${NODE_TAR}" -C "${BUILD_DIR}"
mv "${BUILD_DIR}/node-${NODE_VERSION}-linux-x64/bin/node" "${APPDIR}/usr/bin/node"
rm -f "${NODE_TAR}"
rm -rf "${BUILD_DIR}/node-${NODE_VERSION}-linux-x64"

# 7. Isolate production payload and install clean NPM dependencies
echo "==> Bundling full-stack production build assets into payload..."
cp -r dist "${APPDIR}/usr/share/archforge/"
cp package.json "${APPDIR}/usr/share/archforge/"

echo "==> Compiling isolated production node-dependency subtree within payload..."
cd "${APPDIR}/usr/share/archforge"
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
