/**
 * Utility to parse size strings like "125 MB", "8.4 MB", "1.2 GB" or "500 KB"
 * and convert them to numeric Megabytes (MB).
 */
export function parseSizeToMB(sizeStr: string): number {
  if (!sizeStr) return 45.0; // standard fallback size

  const cleaned = sizeStr.toLowerCase().trim();
  const match = cleaned.match(/^([\d.]+)\s*([a-z]+)?$/);
  if (!match) return 45.0;

  const value = parseFloat(match[1]);
  const unit = match[2] || "mb";

  if (isNaN(value)) return 45.0;

  switch (unit) {
    case "kb":
    case "k":
      return value / 1024;
    case "gb":
    case "g":
      return value * 1024;
    case "tb":
    case "t":
      return value * 1024 * 1024;
    case "mb":
    case "m":
    default:
      return value;
  }
}

/**
 * Calculates approximate build and installation time in seconds.
 * 
 * Logic components:
 * - Base setup / initialization overhead: 8 seconds
 * - Sudo/Keyring validation overhead: 4 seconds
 * - Size compilation work: 0.45 seconds per MB (represents downloading, extracting, and checking headers)
 * - Dependency count overhead: 7.5 seconds per dependency (for sync, verification, and pacman hooks)
 * - Custom multipliers for heavy compiler packages (e.g. "rust", "electron", layout engines, ML binds)
 */
export function estimateBuildTimeSeconds(
  pkgName: string,
  sizeStr: string | undefined,
  dependencyCount: number
): number {
  const sizeInMB = parseSizeToMB(sizeStr || "45.0 MB");
  
  let baseOverhead = 12.0; // Setup + keyring verification
  let depTime = dependencyCount * 7.5;
  let compileTime = sizeInMB * 0.45; 

  // Include heavier workloads for specific packages that are known to take a lot of time
  let multiplier = 1.0;
  const lowerName = pkgName.toLowerCase();
  if (lowerName.includes("rust") || lowerName.includes("cargo")) {
    multiplier = 1.35; // Rust compiler takes more static optimization time
  } else if (lowerName.includes("chromium") || lowerName.includes("electron") || lowerName.includes("webkit") || lowerName.includes("firefox")) {
    multiplier = 1.85; // Massive web layouts
  } else if (lowerName.includes("pytorch") || lowerName.includes("cuda")) {
    multiplier = 1.5;  // Enormous math/bindings sizes
  } else if (lowerName === "system-upgrade") {
    // Systems upgrade parallel sync estimation
    compileTime = (dependencyCount || 3) * 12.0; 
    depTime = 0; 
    baseOverhead = 15.0; 
    multiplier = 1.0;
  }

  const totalTime = (baseOverhead + depTime + compileTime) * multiplier;

  // Clamped output range
  return Math.max(15, Math.ceil(totalTime));
}

/**
 * Formats a duration in seconds into a user-friendly string (e.g. "1m 28s" or "35s").
 */
export function formatEstimatedTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (secs === 0) {
    return `${mins}m`;
  }
  return `${mins}m ${secs}s`;
}
