// Utility to generate realistic Arch Linux / AUR makepkg compilation log lines
// for visual display when compiling packages in our simulator.

export function generateBuildSteps(pkgName: string, pkgVersion: string, depends: string[] = []): { phase: string; lines: string[]; duration: number }[] {
  const steps: { phase: string; lines: string[]; duration: number }[] = [];

  const cacheKey = `archforge-deps-cache-${pkgName}-${pkgVersion}`;
  const isDepsCached = depends.length > 0 && localStorage.getItem(cacheKey) === "cached";

  // Phase 1: Dependency Check & Sync
  if (depends.length > 0) {
    if (isDepsCached) {
      steps.push({
        phase: "Dependency Check (Cached)",
        duration: 300,
        lines: [
          `:: Synchronizing package databases...`,
          `:: Resolving dependencies...`,
          `:: Loading dependency constraints from local build cache...`,
          `   -> ${depends.map((d, i) => `${i + 1}: ${d}`).join(", ")}`,
          `:: Build-time dependencies already satisfied by local cache.`
        ]
      });
    } else {
      steps.push({
        phase: "Dependency Check",
        duration: 1200,
        lines: [
          `:: Synchronizing package databases...`,
          ` core is up to date`,
          ` extra is up to date`,
          ` aur is up to date`,
          `:: Resolving dependencies...`,
          `:: There are ${depends.length} providers for required build-time dependencies:`,
          `   -> ${depends.map((d, i) => `${i + 1}: ${d}`).join(", ")}`,
          `:: Installing build-time dependencies first:`,
          ...depends.flatMap(dep => [
            `   resolving dependencies for ${dep}...`,
            `   looking for conflicting packages...`,
            `   Packages (${dep}): ${dep}-${pkgVersion}-1`,
            `   Total Installed Size:  ${(Math.random() * 10 + 2).toFixed(1)} MiB`,
            `   :: Proceed with installation? [Y/n] y`,
            `   (1/1) checking keys in keyring                    [######################] 100%`,
            `   (1/1) checking package integrity                  [######################] 100%`,
            `   (1/1) loading package files                       [######################] 100%`,
            `   (1/1) checking for file conflicts                 [######################] 100%`,
            `   (1/1) checking available disk space               [######################] 100%`,
            `   :: Installing ${dep}...`,
            `   (1/1) installing ${dep}                          [######################] 100%`,
            `   :: Running post-transaction hooks...`,
            `   (1/1) Arming ConditionNeedsUpdate...`
          ])
        ]
      });
      // Store in local cache to prevent recalculation on next simulator run
      try {
        localStorage.setItem(cacheKey, "cached");
      } catch(e) {}
    }
  }

  // Phase 2: Download & PKGBUILD Check
  steps.push({
    phase: "Source Retrieval",
    duration: 1500,
    lines: [
      `==> Making package: ${pkgName} ${pkgVersion} (Sat May 23 19:56:00 UTC 2026)`,
      `==> Checking runtime dependencies...`,
      `==> Checking buildtime dependencies...`,
      `==> Retrieving sources...`,
      `  -> Downloading ${pkgName}-${pkgVersion}.tar.gz...`,
      `    % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current` ,
      `                                   Dload  Upload   Total   Spent    Left  Speed`,
      `  100 4220k  100 4220k    0     0  12.4M      0 --:--:-- --:--:-- --:--:-- 12.4M`,
      `  -> Cloning git repository for submodules...`,
      `  Cloning into bare repository '/var/cache/sources/${pkgName}'...`,
      `  remote: Enumerating objects: 104, done.`,
      `  remote: Counting objects: 100% (104/104), done.`,
      `  remote: Compressing objects: 100% (78/78), done.`,
      `  Receiving objects: 100% (4521/4521), 1.84 MiB | 4.21 MiB/s, done.`,
      `  Resolving deltas: 100% (1202/1202), done.`,
      `==> Validating source files with sha256sums...`,
      `    ${pkgName}-${pkgVersion}.tar.gz ... Passed`,
      `    setup.patch ... Passed`,
      `    config.h ... Passed`
    ]
  });

  // Phase 3: Extraction & Patches
  steps.push({
    phase: "Extraction & Prep",
    duration: 1000,
    lines: [
      `==> Extracting sources...`,
      `  -> Extracting ${pkgName}-${pkgVersion}.tar.gz with bsdtar`,
      `==> Starting prepare()...`,
      `  applying patch setup.patch...`,
      `  patching file src/config.h`,
      `  Hunk #1 succeeded at 56 (offset 2 lines).`,
      `  Adding multi-platform native overrides...`,
      `  Checking compiler capability: gcc -O3 (supported)`,
      `  Checking development environment: headers and tools discovered`
    ]
  });

  // Phase 4: Build / Compilation
  const compileProgress: string[] = [
    `==> Starting build()...`,
    `  cmake -DCMAKE_INSTALL_PREFIX=/usr -DCMAKE_BUILD_TYPE=Release -DENABLE_LTO=ON ..`,
    `  -- The C compiler identification is GNU 14.1.0`,
    `  -- The CXX compiler identification is GNU 14.1.0`,
    `  -- Detecting C compiler ABI info`,
    `  -- Detecting C compiler ABI info - Success`,
    `  -- Check for working C compiler: /usr/bin/gcc - skipped`,
    `  -- Detecting CXX compiler ABI info`,
    `  -- Detecting CXX compiler ABI info - Success`,
    `  -- Configured with native SIMD: AVX2, SSE4.2`,
    `  -- Configuring done (0.2s)`,
    `  -- Generating done (0.1s)`,
    `  -- Build files have been written to: /tmp/makepkg/${pkgName}/src/build`,
    `  ninja -j$(nproc)`
  ];

  for (let pct = 5; pct <= 100; pct += Math.floor(Math.random() * 15) + 10) {
    const safePct = pct > 100 ? 100 : pct;
    compileProgress.push(
      `  [ ${safePct.toString().padStart(3)}%] Building CXX object CMakeFiles/${pkgName}.dir/src/core_${Math.floor(safePct / 10)}.cpp.o`
    );
    if (safePct % 4 === 0) {
      compileProgress.push(
        `  /tmp/makepkg/${pkgName}/src/core_${Math.floor(safePct / 10)}.cpp: In function 'void initialize()':`,
        `  \x1b[33mwarning:\x1b[0m 'void* std::memset(void*, int, size_t)' clearing an object of non-trivial type [\x1b[36m-Wclass-memaccess\x1b[0m]`,
        `    memset(buffer, 0, sizeof(struct CoreState));`
      );
    }
  }

  compileProgress.push(
    `  [100%] Linking CXX executable ${pkgName}`,
    `  Strip debugging symbols... success`,
    `  Build completed successfully in the temporary environment.`
  );

  steps.push({
    phase: "Compilation",
    duration: 2500,
    lines: compileProgress
  });

  // Phase 5: Packaging & Code Generation
  steps.push({
    phase: "Packaging",
    duration: 1200,
    lines: [
      `==> Starting package()...`,
      `  Installing files to /tmp/makepkg/${pkgName}/pkg/${pkgName}/usr/bin/`,
      `  Installing desktop files and icons...`,
      `  Installing systemd integration services...`,
      `==> Tidying install...`,
      `  -> Removing libtool files...`,
      `  -> Purging unwanted files...`,
      `  -> Removing static library files...`,
      `  -> Stripping unneeded symbols from binaries and libraries...`,
      `  -> Compressing man and info pages...`,
      `==> Checking for packaging issues...`,
      `==> Creating package "${pkgName}"...`,
      `  -> Generating .PKGINFO file...`,
      `  -> Generating .BUILDINFO file...`,
      `  -> Generating .MTREE file...`,
      `  -> Compressing package...`,
      `    Creating ${pkgName}-${pkgVersion}-1-x86_64.pkg.tar.zst...`
    ]
  });

  // Phase 6: System Installation via pacman -U
  steps.push({
    phase: "Pacman Register",
    duration: 1000,
    lines: [
      `==> Finished making package: ${pkgName} (compilation success)`,
      `[sudo] password for archforge: `,
      `loading packages...`,
      `resolving dependencies...`,
      `looking for conflicting packages...`,
      `Packages (1) ${pkgName}-${pkgVersion}-1`,
      `Total Installed Size:  ${(Math.random() * 50 + 5).toFixed(1)} MiB`,
      `Net Upgrade Size:      ${(Math.random() * 5 + 1).toFixed(1)} MiB`,
      `:: Proceed with installation? [Y/n] y`,
      `(1/1) checking keys in keyring                    [######################] 100%`,
      `(1/1) checking package integrity                  [######################] 100%`,
      `(1/1) loading package files                       [######################] 100%`,
      `(1/1) checking for file conflicts                 [######################] 100%`,
      `(1/1) checking available disk space               [######################] 100%`,
      `:: Processing package changes...`,
      `(1/1) installing ${pkgName}                        [######################] 100%`,
      `:: Running post-transaction hooks...`,
      `(1/2) Arming ConditionNeedsUpdate...`,
      `(2/2) Updating desktop database icon cache...`,
      `:: Installation of ${pkgName}-${pkgVersion}-1 was successful!`
    ]
  });

  return steps;
}
