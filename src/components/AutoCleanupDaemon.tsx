import { useEffect } from "react";
import { parseSizeToMB } from "../utils/buildTimeEstimator";

export default function AutoCleanupDaemon() {
  useEffect(() => {
    // Check every 2 minutes
    const interval = setInterval(async () => {
      const enabled = localStorage.getItem("archforge_autoclean") === "true";
      if (!enabled) return;

      const thresholdStr = localStorage.getItem("archforge_autoclean_threshold") || "2"; // in GB
      const thresholdMB = parseFloat(thresholdStr) * 1024;

      try {
        const scanRes = await fetch("/api/system/cleanup/scan");
        if (!scanRes.ok) {
          console.warn(`[AutoCleanup] Backend unavailable (${scanRes.status}), skipping cycle.`);
          return;
        }
        const data = await scanRes.json();
        const aurSizeRaw = data.aurCacheSize || "0 B"; // "840 MB" or "2.4 GB"
        const currentMB = parseSizeToMB(aurSizeRaw);

        if (currentMB > thresholdMB) {
          console.log(`[AutoCleanup] AUR Cache size (${currentMB} MB) exceeded threshold (${thresholdMB} MB). Purging...`);
          // Execute cleanup just for AUR cache
          await fetch("/api/system/cleanup/execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              removeOrphans: false,
              clearSystemCache: false,
              clearAurCache: true,
            })
          });
        }
      } catch (err) {
        console.error("Auto cleanup background task failed:", err);
      }
    }, 120000); // 120 seconds

    return () => clearInterval(interval);
  }, []);

  return null; // Invisible daemon
}
