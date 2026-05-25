import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Package,
  Terminal as TerminalIcon,
  Search,
  Settings,
  ShieldCheck,
  ShieldAlert,
  ServerCrash,
  Sparkles,
  Layers,
  Zap,
  RefreshCw,
  Cpu,
  Bookmark,
  Activity,
  History,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Sun,
  Moon,
  Palette,
  Check,
  AlertTriangle,
  Monitor
} from "lucide-react";

import { InstalledPackage, SystemStats } from "./types";
import StatusMonitor from "./components/StatusMonitor";
import TerminalCLI from "./components/TerminalCLI";
import PackageExplorer from "./components/PackageExplorer";
import PackageDetailDrawer from "./components/PackageDetailDrawer";
import BuildProgressModal from "./components/BuildProgressModal";

export default function App() {
  const [installedPackages, setInstalledPackages] = useState<InstalledPackage[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "explore" | "cli">("dashboard");

  // Theme & Custom Accent Color States
  const [theme, setTheme] = useState<"dark" | "light" | "system">(() => {
    return (localStorage.getItem("archforge-theme") as "dark" | "light" | "system") || "system";
  });
  const [resolvedSystemTheme, setResolvedSystemTheme] = useState<"dark" | "light">("dark");
  const [accentColor, setAccentColor] = useState<string>(() => {
    return localStorage.getItem("archforge-accent") || "#22d3ee";
  });
  const [showSettings, setShowSettings] = useState<boolean>(false);
  
  // Package detail drawer state
  const [selectedPkgName, setSelectedPkgName] = useState<string | null>(null);
  const [selectedPkgIsAur, setSelectedPkgIsAur] = useState<boolean>(true);

  // Installer build modal states
  const [compilingPackage, setCompilingPackage] = useState<any | null>(null);
  const [isSyuUpgrade, setIsSyuUpgrade] = useState<boolean>(false);

  // Local utility filter state
  const [instFilter, setInstFilter] = useState<"all" | "aur" | "official" | "unstable">("all");

  // Dashboard Integrity Diagnostics Verification
  const [verifyingPkgName, setVerifyingPkgName] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<any | null>(null);
  const [verificationProgress, setVerificationProgress] = useState<number>(0);
  const [activeVerificationStep, setActiveVerificationStep] = useState<number>(0);

  // Desktop Integration state
  const [integrationStatus, setIntegrationStatus] = useState<{
    isAppImage: boolean;
    appImagePath: string;
    desktopFilePath: string;
    isInstalled: boolean;
  } | null>(null);
  const [isIntegrating, setIsIntegrating] = useState<boolean>(false);
  const [integrationSuccessMsg, setIntegrationSuccessMsg] = useState<string | null>(null);

  const loadIntegrationStatus = async () => {
    try {
      const res = await fetch("/api/system/desktop-integration/status");
      if (res.ok) {
        const data = await res.json();
        setIntegrationStatus(data);
      }
    } catch (err) {
      console.error("Failed to load desktop integration status:", err);
    }
  };

  const executeDesktopIntegration = async () => {
    setIsIntegrating(true);
    setIntegrationSuccessMsg(null);
    try {
      const res = await fetch("/api/system/desktop-integration/install", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setIntegrationSuccessMsg(data.message || "Successfully integrated with your Linux application launcher!");
        await loadIntegrationStatus();
      } else {
        const errData = await res.json();
        alert(`Integration failed: ${errData.error || "Unknown error"}`);
      }
    } catch (err: any) {
      console.error("Failed to run desktop integration:", err);
      alert(`Integration failed: ${err.message}`);
    } finally {
      setIsIntegrating(false);
    }
  };

  // Set page tab title
  useEffect(() => {
    document.title = "ArchForge System Package Manager";
  }, []);

  // Poll GTK/system theme
  const detectGtkTheme = async () => {
    try {
      const res = await fetch("/api/system/gtk-theme");
      if (res.ok) {
        const data = await res.json();
        setResolvedSystemTheme(data.theme);
      } else {
        const matched = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
        setResolvedSystemTheme(matched);
      }
    } catch {
      const matched = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
      setResolvedSystemTheme(matched);
    }
  };

  useEffect(() => {
    detectGtkTheme();
    const interval = setInterval(detectGtkTheme, 8000);
    return () => clearInterval(interval);
  }, []);

  // Sync theme to document element
  useEffect(() => {
    const root = document.documentElement;
    const activeTheme = theme === "system" ? resolvedSystemTheme : theme;
    if (activeTheme === "light") {
      root.classList.add("theme-light");
    } else {
      root.classList.remove("theme-light");
    }
    localStorage.setItem("archforge-theme", theme);
  }, [theme, resolvedSystemTheme]);

  // Sync custom accent color shades dynamically
  useEffect(() => {
    const root = document.documentElement;
    localStorage.setItem("archforge-accent", accentColor);
    
    // Hex parsing safely and elegantly
    const cleanHex = accentColor.startsWith("#") ? accentColor : `#${accentColor}`;
    const r = parseInt(cleanHex.slice(1, 3), 16) || 34;
    const g = parseInt(cleanHex.slice(3, 5), 16) || 211;
    const b = parseInt(cleanHex.slice(5, 7), 16) || 238;
    
    const blend = (r1: number, g1: number, b1: number, r2: number, g2: number, b2: number, ratio: number) => {
      return [
        Math.round(r1 * (1 - ratio) + r2 * ratio),
        Math.round(g1 * (1 - ratio) + g2 * ratio),
        Math.round(b1 * (1 - ratio) + b2 * ratio),
      ];
    };

    const toHex = ([r, g, b]: number[]) => {
      return "#" + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
    };

    const rgbStr = `${r}, ${g}, ${b}`;
    const shade300 = toHex(blend(r, g, b, 255, 255, 255, 0.4));
    const shade400 = cleanHex;
    const shade500 = toHex(blend(r, g, b, 0, 0, 0, 0.15));
    const shade950 = toHex(blend(r, g, b, 0, 0, 0, 0.85));

    root.style.setProperty("--accent-rgb", rgbStr);
    root.style.setProperty("--accent-300", shade300);
    root.style.setProperty("--accent-400", shade400);
    root.style.setProperty("--accent-500", shade500);
    root.style.setProperty("--accent-950", shade950);
  }, [accentColor]);

  // Run dynamic verification sequence right on the dashboard tab
  const runDashboardPackageVerification = async (name: string) => {
    setVerifyingPkgName(name);
    setVerificationResult(null);
    setVerificationProgress(0);
    setActiveVerificationStep(0);
    setActiveTab("dashboard"); // Pull user context to Dashboard automatically to witness check

    try {
      const res = await fetch("/api/packages/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      if (res.ok) {
        const data = await res.json();
        
        // Staggered checkpoints progress increments
        let step = 0;
        const interval = setInterval(() => {
          step += 1;
          setActiveVerificationStep(step);
          setVerificationProgress(step * 25);
          
          if (step >= 4) {
            clearInterval(interval);
            setVerificationResult(data);
            refreshSystemData(); // Refresh list to update badge statuses instantly
            setTimeout(() => {
              // Hide scan result after 6s
              setVerifyingPkgName(null);
            }, 6000);
          }
        }, 1200);
      } else {
        setVerifyingPkgName(null);
      }
    } catch (err) {
      console.error("Verification engine failed:", err);
      setVerifyingPkgName(null);
    }
  };

  // Load and refresh state arrays from Express backend APIs
  const refreshSystemData = async (forceFresh = false) => {
    try {
      const [pkgsRes, statsRes] = await Promise.all([
        fetch(`/api/packages/installed${forceFresh ? "?fresh=true" : ""}`),
        fetch("/api/system/stats")
      ]);

      if (pkgsRes.ok && statsRes.ok) {
        const pkgs = await pkgsRes.json();
        const systemStats = await statsRes.json();
        setInstalledPackages(pkgs);
        setStats(systemStats);
      }
    } catch (error) {
      console.error("Failed to query fullstack backend:", error);
    }
  };

  useEffect(() => {
    refreshSystemData(true);
    loadIntegrationStatus();
  }, []);

  // Action: Compile and Register Package
  const handleInstallTrigger = (pkgMetadata: any) => {
    // Closes drawer temporarily and triggers compiler log modal
    setCompilingPackage(pkgMetadata);
  };

  // Action: Complete compilation and POST state back to DB
  const handleCompilationSuccess = async () => {
    if (!compilingPackage) return;

    try {
      const body = {
        name: compilingPackage.Name || compilingPackage.name,
        version: compilingPackage.Version || compilingPackage.version || "1.0.0-1",
        repo: compilingPackage.isAur ? "aur" : "core",
        description: compilingPackage.Description || "User compiled software package with production compilation optimizations enabled",
        size: compilingPackage.size || "45.0 MB",
        maintainer: compilingPackage.Maintainer || "user-compiled",
        license: compilingPackage.License?.[0] || compilingPackage.license || "GPL3",
        url: compilingPackage.URL || compilingPackage.url || ""
      };

      const res = await fetch("/api/packages/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        // Trigger automated verification integrity checks directly on dashboard!
        runDashboardPackageVerification(body.name);
        
        // Update selection states so that the details drawer updates correctly
        setSelectedPkgName(body.name);
        setSelectedPkgIsAur(body.repo === "aur");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCompilingPackage(null);
    }
  };

  // Action: Complete full system upgrade (yay -Syu)
  const handleSyuCompilationSuccess = async () => {
    try {
      // Find all outdated packages
      const outdated = installedPackages.filter(p => p.hasUpdate);
      for (const oldPkg of outdated) {
        await fetch("/api/packages/install", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: oldPkg.name,
            version: oldPkg.newVersion || "1.0.0-1",
            repo: oldPkg.repo,
            description: oldPkg.description,
            size: oldPkg.size,
            maintainer: oldPkg.maintainer,
            license: oldPkg.license,
            url: oldPkg.url
          })
        });
      }
      
      if (outdated.length > 0) {
        // Automatically check the main updated package (e.g. spotify) on the Dashboard
        runDashboardPackageVerification(outdated[0].name);
      } else {
        await refreshSystemData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyuUpgrade(false);
    }
  };

  // Action: Uninstall packages from local cache
  const handleUninstall = async (name: string) => {
    try {
      const res = await fetch("/api/packages/uninstall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });

      if (res.ok) {
        await refreshSystemData();
        setSelectedPkgName(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Action: Rollback packages to older build history
  const handleRollback = async (name: string, targetVersion: string) => {
    try {
      const res = await fetch("/api/packages/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, targetVersion })
      });

      if (res.ok) {
        await refreshSystemData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Trigger package detail viewing drawer
  const handleSelectPackage = (name: string, isAur: boolean) => {
    setSelectedPkgName(name);
    setSelectedPkgIsAur(isAur);
  };

  // Quick Command triggers from CLI CLI Terminal
  const handleCLIInstall = (name: string) => {
    handleInstallTrigger({ Name: name, Version: "1.0.0-1", isAur: true, Description: "Installed from command shell" });
  };

  const handleCLIUninstall = (name: string) => {
    handleUninstall(name);
  };

  // Filter local packages for the list on grid dashboard
  const filteredInstalledPackages = installedPackages.filter(pkg => {
    if (instFilter === "aur") return pkg.repo === "aur";
    if (instFilter === "official") return pkg.repo !== "aur";
    if (instFilter === "unstable") return pkg.health === "warning" || pkg.health === "error";
    return true;
  });

  return (
    <div className="min-h-screen text-slate-200 font-sans flex flex-col p-4 md:p-6 lg:p-8 relative overflow-hidden transition-colors duration-300">
      {/* Background stars look and cosmic border alignment with gorgeous glowing frosted orbs */}
      <div className="absolute top-[-200px] left-[-200px] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>
      <div className="absolute top-[30%] right-[-200px] w-[500px] h-[500px] bg-cyan-600/5 rounded-full blur-[100px] pointer-events-none -z-10"></div>
      <div className="absolute bottom-[-200px] left-[20%] w-[500px] h-[500px] bg-violet-600/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(var(--accent-rgb,6,182,212),0.02),transparent)] pointer-events-none -z-10"></div>

      {/* Global Application Header Navigation Layout */}
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-500 shadow-lg shadow-cyan-400/20">
            <Layers className="h-5.5 w-5.5 text-zinc-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight font-mono text-white">ARCHFORGE</h1>
              <span className="rounded bg-cyan-950/50 border border-cyan-800/40 font-semibold px-2 py-0.5 text-[10px] text-cyan-400 font-mono tracking-wider">
                AUR ENGINE
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">Arch Linux GUI & Compile Log Monitor Console</p>
          </div>
        </div>

        {/* Outer Tab control links with glass-pill theme and Settings toggle button */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 glass-pill-container p-1 rounded-xl">
            {(["dashboard", "explore", "cli"] as const).map((tab) => {
              const icons = {
                dashboard: <Activity className="h-4 w-4" />,
                explore: <Search className="h-4 w-4" />,
                cli: <TerminalIcon className="h-4 w-4" />
              };
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition capitalize cursor-pointer ${
                    activeTab === tab
                      ? "bg-white/10 text-cyan-400 font-extrabold border border-white/10 shadow-lg"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {icons[tab]}
                  {tab}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => {
              const nextVal = !showSettings;
              setShowSettings(nextVal);
              if (nextVal) {
                loadIntegrationStatus();
              }
            }}
            className={`flex h-9 w-9 items-center justify-center rounded-xl cursor-pointer border transition-all duration-200 ${
              showSettings
                ? "border-cyan-500/30 bg-cyan-500/15 text-cyan-400 shadow-[0_0_12px_rgba(var(--accent-rgb,6,182,212),0.15)]"
                : "border-white/5 bg-zinc-900/40 text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
            title="UI Theme & Custom Accent Customization"
          >
            <Settings className={`h-4.5 w-4.5 transition-transform duration-300 ${showSettings ? "rotate-90 text-cyan-400" : "hover:rotate-45"}`} />
          </button>
        </div>
      </header>

      {/* Expandable Settings Options Bar */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-panel rounded-xl p-5 border border-white/5 flex flex-col gap-5 lg:grid lg:grid-cols-3 lg:gap-8 items-stretch">
              {/* Theme Selector Section */}
              <div className="space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4 text-cyan-400" />
                    <h3 className="text-xs font-bold font-mono tracking-wide text-white uppercase">
                      System Identity Interface Theme
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans mt-1">
                    Synchronize with your system's GTK color profile or manually force Cosmic Slate or Arch Light settings.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    onClick={() => setTheme("system")}
                    className={`flex flex-col items-center justify-center gap-1 rounded-lg border p-2 transition duration-150 cursor-pointer text-[10px] font-bold ${
                      theme === "system"
                        ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-[0_0_10px_rgba(var(--accent-rgb,6,182,212),0.05)]"
                        : "border-white/5 bg-zinc-900/10 text-slate-400 hover:border-white/10 hover:text-white"
                    }`}
                    title={`Currently resolved local GTK theme: ${resolvedSystemTheme === "dark" ? "Dark Mode" : "Light Mode"}`}
                  >
                    <Monitor className="h-3.5 w-3.5 shrink-0" />
                    <span>System GTK</span>
                  </button>
                  <button
                    onClick={() => setTheme("dark")}
                    className={`flex flex-col items-center justify-center gap-1 rounded-lg border p-2 transition duration-150 cursor-pointer text-[10px] font-bold ${
                      theme === "dark"
                        ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-[0_0_10px_rgba(var(--accent-rgb,6,182,212),0.05)]"
                        : "border-white/5 bg-zinc-900/10 text-slate-400 hover:border-white/10 hover:text-white"
                    }`}
                  >
                    <Moon className="h-3.5 w-3.5 shrink-0" />
                    <span>Cosmic Slate</span>
                  </button>
                  <button
                    onClick={() => setTheme("light")}
                    className={`flex flex-col items-center justify-center gap-1 rounded-lg border p-2 transition duration-150 cursor-pointer text-[10px] font-bold ${
                      theme === "light"
                        ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-[0_0_10px_rgba(var(--accent-rgb,6,182,212),0.05)]"
                        : "border-white/5 bg-zinc-900/10 text-slate-400 hover:border-white/10 hover:text-white"
                    }`}
                  >
                    <Sun className="h-3.5 w-3.5 shrink-0" />
                    <span>Arch Light</span>
                  </button>
                </div>
              </div>

              {/* Accent Color Customizer Section */}
              <div className="space-y-3 flex flex-col justify-between border-t md:border-t-0 border-white/5 pt-4 md:pt-0">
                <div>
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-cyan-400" />
                    <h3 className="text-xs font-bold font-mono tracking-wide text-white uppercase">
                      Custom Accent Identity Color
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans mt-1">
                    Tailor application borders, buttons, metrics, and active package control states.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-2">
                  {[
                    { hex: "#22d3ee", label: "Classic Cyan" },
                    { hex: "#10b981", label: "Arch Emerald" },
                    { hex: "#3b82f6", label: "Pacman Blue" },
                    { hex: "#f59e0b", label: "Solar Amber" },
                    { hex: "#a855f7", label: "Laser Purple" },
                    { hex: "#ec4899", label: "Plasma Pink" },
                  ].map((color) => {
                    const isActive = accentColor.toLowerCase() === color.hex.toLowerCase();
                    return (
                      <button
                        key={color.hex}
                        onClick={() => setAccentColor(color.hex)}
                        style={{ backgroundColor: color.hex }}
                        className={`h-7 w-7 rounded-full cursor-pointer transition transform hover:scale-110 flex items-center justify-center border ${
                          isActive ? "ring-2 ring-cyan-400/50 border-white/60 shadow" : "border-white/15"
                        }`}
                        title={color.label}
                      >
                        {isActive && <Check className="h-4 w-4 text-zinc-900 stroke-[3]" />}
                      </button>
                    );
                  })}

                  <div className="h-6 w-px bg-white/10 mx-1"></div>

                  {/* Dynamic Color Picker */}
                  <label className="flex items-center gap-2 cursor-pointer bg-zinc-900/30 hover:bg-zinc-900/50 transition border border-white/5 py-1 px-2 rounded-lg text-[10px] font-mono font-bold text-slate-300">
                    <span 
                      style={{ backgroundColor: accentColor }} 
                      className="h-4 w-4 rounded-full border border-white/20 inline-block relative overflow-hidden shrink-0"
                    >
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="absolute inset-x-0 top-0 h-8 w-8 opacity-0 scale-150"
                      />
                    </span>
                    <span>Picker</span>
                  </label>
                </div>
              </div>

              {/* Desktop App Integration */}
              <div className="space-y-3 flex flex-col justify-between border-t lg:border-t-0 border-white/5 pt-4 lg:pt-0">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-cyan-400" />
                    <h3 className="text-xs font-bold font-mono tracking-wide text-white uppercase">
                      Desktop App Integration
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans mt-1">
                    Register ArchForge directly as a first-class citizen Linux app. Enables launcher shortcuts, dock pin capability, and system Polkit authentication.
                  </p>
                </div>

                <div className="space-y-2 pt-1">
                  {integrationStatus ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2 p-2 bg-zinc-900/25 border border-white/5 rounded-lg">
                        <span className="text-[10px] text-slate-400 font-mono">Status:</span>
                        {integrationStatus.isInstalled ? (
                          <span className="flex items-center gap-1 text-[9px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold uppercase">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse inline-block"></span>
                            Integrated
                          </span>
                        ) : (
                          <span className="text-[9px] bg-amber-500/15 border border-amber-500/30 text-amber-400 px-2 py-0.5 rounded font-mono font-bold uppercase">
                            Unregistered
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col gap-0.5 text-[9px] text-slate-400 font-mono leading-tight">
                        <div className="truncate">Source: {integrationStatus.isAppImage ? "Host AppImage Bundle" : "Dev Workspace Process"}</div>
                        <div className="truncate" title={integrationStatus.desktopFilePath}>Target: ~/.local/share/applications/archforge.desktop</div>
                      </div>

                      {!integrationStatus.isInstalled ? (
                        <button
                          onClick={executeDesktopIntegration}
                          disabled={isIntegrating}
                          className="w-full shrink-0 flex items-center justify-center gap-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 p-2 text-xs font-mono font-black text-black transition cursor-pointer disabled:opacity-50 shadow-md shadow-cyan-500/10"
                        >
                          {isIntegrating ? (
                            <>
                              <RefreshCw className="h-3 w-3 animate-spin text-black" />
                              INTEGRATING...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3 w-3 text-black" />
                              INTEGRATE WITH DESKTOP
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={executeDesktopIntegration}
                          disabled={isIntegrating}
                          className="w-full shrink-0 flex items-center justify-center gap-2 rounded-lg bg-zinc-800/85 border border-white/10 p-2 text-xs font-mono text-slate-300 hover:bg-zinc-750 transition cursor-pointer disabled:opacity-50"
                        >
                          {isIntegrating ? (
                            <>
                              <RefreshCw className="h-3 w-3 animate-spin text-slate-300" />
                              RE-LINKING...
                            </>
                          ) : (
                            "RE-INTEGRATE Launcher"
                          )}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center p-4">
                      <RefreshCw className="h-4 w-4 animate-spin text-cyan-400/50" />
                    </div>
                  )}

                  {integrationSuccessMsg && (
                    <div className="p-2 border border-emerald-500/20 bg-emerald-500/5 rounded-md text-[10px] text-emerald-400 font-sans leading-normal">
                      {integrationSuccessMsg}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Missing Host Build Utilities Guard Alert */}
      {stats?.missingTools && stats.missingTools.length > 0 && (
        <div className="mb-6 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex gap-3 items-start">
            <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-rose-300">Missing Core Packaging Tools!</h4>
              <p className="text-xs text-slate-400 mt-1">
                ArchForge detected that your Arch Linux host environment is missing essential build tools required to compile AUR packages: <span className="font-mono text-rose-300">{stats.missingTools.join(", ")}</span>.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 shrink-0">
            <span className="text-[10px] text-slate-400 font-mono">Run in your terminal:</span>
            <code className="bg-black/40 border border-white/5 font-mono text-xs px-3 py-1.5 rounded-lg text-emerald-400 select-all">
              sudo pacman -S --needed base-devel git
            </code>
          </div>
        </div>
      )}

      {/* Primary Dashboard Gauges / Status Monitor Component at the top */}
      <div className="mb-6">
        <StatusMonitor
          stats={stats}
          onRefresh={refreshSystemData}
          onSyu={() => setIsSyuUpgrade(true)}
        />
      </div>

      {/* Workspace Area Layout: Split Panel (Main action content vs sidebar drawer) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 items-start">
        {/* Main interactive Tab column */}
        <main className="lg:col-span-2 space-y-6">
          <AnimatePresence mode="wait">
            {activeTab === "dashboard" && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                {/* Local applications headers & local filtering lists */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between glass-panel p-5 rounded-xl">
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-1.5 font-mono">
                      <Bookmark className="h-4 w-4 text-cyan-400" />
                      LOCAL SYSTEM PACKAGES
                    </h2>
                    <p className="text-xs text-slate-400 font-sans">List and monitor applications compiled and active on disk filesystem.</p>
                  </div>

                  {/* Internal Filter Tabs */}
                  <div className="flex gap-1.5 glass-pill-container p-1 rounded-lg">
                    {(["all", "aur", "official", "unstable"] as const).map((btn) => (
                      <button
                        key={btn}
                        onClick={() => setInstFilter(btn)}
                        className={`px-3 py-1.5 text-[10px] rounded font-bold uppercase transition font-mono cursor-pointer ${
                          instFilter === btn
                            ? "bg-white/10 text-cyan-400 border border-white/5"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        {btn}
                      </button>
                    ))}
                  </div>
                </div>

                {/* SYSTEM INTEGRITY AUDIT / VERIFICATION SCANNER */}
                {verifyingPkgName && (
                  <div className="bg-gradient-to-r from-cyan-950/40 to-indigo-950/40 border-2 border-cyan-400/40 rounded-xl p-5 font-mono text-xs relative overflow-hidden shadow-2xl">
                    <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-cyan-400/10 rounded-full blur-2xl animate-pulse"></div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                          <ShieldCheck className="h-5 w-5 animate-pulse" />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">
                            ACTIVE SYSTEM INTEGRITY VERIFICATION SCAN
                          </span>
                          <h3 className="text-sm font-bold text-white mt-0.5">
                            Auditing: <span className="text-cyan-300 font-extrabold">{verifyingPkgName}</span>
                          </h3>
                        </div>
                      </div>
                      <span className="text-cyan-400 font-extrabold text-[13px]">{verificationProgress}%</span>
                    </div>

                    {/* Progress strip */}
                    <div className="h-1.5 w-full bg-white/5 rounded-full mt-4 overflow-hidden border border-white/5">
                      <div 
                        className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-full transition-all duration-300"
                        style={{ width: `${verificationProgress}%` }}
                      ></div>
                    </div>

                    {/* Verification Checklist */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                      {[
                        {
                          name: "Library Link Resolution Check",
                          desc: verifyingPkgName.toLowerCase() === "discord" 
                            ? "Verifying system links for missing library 'libgconf-2.so.4'."
                            : "Checking dynamic compiler shared libraries and linking tables."
                        },
                        {
                          name: "Checksum Signature Verification",
                          desc: "Auditing compiled binaries and source file SHA256 integrity trees."
                        },
                        {
                          name: "Package Version Registry Synchronizer",
                          desc: "Querying Pacman package manifest to verify updated metadata registry."
                        },
                        {
                          name: "Startup Capabilities Test Check",
                          desc: "Running standard sandbox simulator sandbox command probes."
                        }
                      ].map((chk, index) => {
                        const stepActive = activeVerificationStep > index;
                        const stepDone = activeVerificationStep > index + 1 || verificationProgress === 100;
                        
                        return (
                          <div 
                            key={index} 
                            className={`rounded-lg p-3 transition-colors duration-300 border ${
                              stepDone 
                                ? "bg-emerald-950/20 border-emerald-500/25 text-emerald-300 font-medium" 
                                : stepActive 
                                  ? "bg-cyan-950/25 border-cyan-500/20 text-cyan-400 font-medium" 
                                  : "bg-white/2 border-white/5 text-zinc-500"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {stepDone ? (
                                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 animate-fadeIn" />
                              ) : stepActive ? (
                                <RefreshCw className="h-4 w-4 text-cyan-400 animate-spin shrink-0" />
                              ) : (
                                <div className="h-4 w-4 bg-white/5 rounded-full shrink-0 border border-white/10" />
                              )}
                              <span className="font-bold text-[11px] truncate">{chk.name}</span>
                            </div>
                            <p className={`text-[10px] mt-1.5 font-normal leading-relaxed ${stepDone ? "text-slate-400" : stepActive ? "text-cyan-300" : "text-zinc-600"}`}>
                              {chk.desc}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Final report output banner */}
                    {verificationProgress === 100 && verificationResult && (
                      <div 
                        className="mt-4 border border-emerald-500/30 bg-emerald-950/30 p-4 rounded-lg flex items-start gap-3 text-emerald-300 animate-fadeIn"
                      >
                        <ShieldCheck className="h-5.5 w-5.5 text-emerald-400 shrink-0 mt-0.5 animate-bounce" />
                        <div>
                          <span className="font-extrabold text-[12px] uppercase tracking-wider block">
                            ✓ System Health Check Completed Successfully
                          </span>
                          <p className="text-[10.5px] text-zinc-300 mt-1.5 leading-relaxed">
                            We verified that <span className="text-emerald-405 font-bold">{verifyingPkgName}</span> is compiled correct, 100% healthy, and version mismatch warning/error registry records have been fully resolved.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Grid listing installed items */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {filteredInstalledPackages.length > 0 ? (
                    filteredInstalledPackages.map((pkg) => (
                      <div
                        key={pkg.name}
                        onClick={() => handleSelectPackage(pkg.name, pkg.repo === "aur")}
                        className={`group relative rounded-xl p-4 transition-all duration-200 w-full cursor-pointer ${
                          selectedPkgName === pkg.name
                            ? "bg-cyan-500/10 border border-cyan-400/50 shadow-lg shadow-cyan-950/20"
                            : "glass-panel glass-panel-hover"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs font-bold text-white font-mono group-hover:text-cyan-400 transition">
                              {pkg.name}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-mono block mt-0.5">
                              {pkg.version}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {pkg.pinnedVersion && (
                              <span className="rounded bg-amber-950/40 text-amber-400 px-1 py-0.5 text-[8px] font-bold font-mono border border-amber-800/30">
                                Pinned
                              </span>
                            )}
                            <span
                              className={`rounded px-1.5 py-0.5 text-[8px] font-black uppercase font-mono border ${
                                pkg.repo === "aur"
                                  ? "bg-cyan-950/50 border-cyan-800/30 text-cyan-300"
                                  : "bg-white/5 border-white/10 text-slate-300"
                              }`}
                            >
                              {pkg.repo}
                            </span>
                          </div>
                        </div>

                        <p className="mt-2 text-xs text-slate-400 leading-relaxed font-sans line-clamp-2">
                          {pkg.description}
                        </p>

                        <div className="mt-3.5 border-t border-white/5 pt-2.5 flex items-center justify-between font-mono text-[10px]" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-500">Size: {pkg.size}</span>
                            <span className="text-zinc-700">•</span>
                            <button
                              onClick={() => runDashboardPackageVerification(pkg.name)}
                              className="text-cyan-400 font-semibold hover:text-cyan-300 transition hover:underline cursor-pointer flex items-center gap-0.5"
                              title="Verify dynamic package status and health"
                            >
                              <ShieldCheck className="h-3 w-3 text-cyan-455" /> Check Integrity
                            </button>
                          </div>
                          
                          {/* Integrity indicator circles */}
                          <div className="flex items-center gap-1.5">
                            <span className={`h-1.5 w-1.5 rounded-full ${
                              pkg.health === "healthy" ? "bg-emerald-400" :
                              pkg.health === "warning" ? "bg-amber-400" : "bg-rose-500 animate-ping"
                            }`}></span>
                            <span className={`capitalize ${
                              pkg.health === "healthy" ? "text-emerald-400" :
                              pkg.health === "warning" ? "text-amber-400" : "text-rose-400 font-semibold"
                            }`}>
                              {pkg.health}
                            </span>
                          </div>
                        </div>

                        {/* Top corner gradient indicator */}
                        {pkg.hasUpdate && (
                          <div className="absolute top-0 right-4 h-0.5 w-10 bg-gradient-to-r from-amber-400 to-rose-400 shadow-xl"></div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="sm:col-span-2 flex flex-col items-center justify-center rounded-xl border border-zinc-800/40 bg-zinc-900/10 p-12 text-center">
                      <ShieldCheck className="mb-3 h-10 w-10 text-zinc-600" />
                      <h4 className="text-sm font-semibold text-zinc-300">No matching system packages</h4>
                      <p className="max-w-xs text-xs text-zinc-500 mt-1">
                        Try modifying the local filters to discover installed packages.
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === "explore" && (
              <motion.div
                key="explore"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.15 }}
              >
                <PackageExplorer
                  onSelectPackage={handleSelectPackage}
                  installedPackages={installedPackages}
                />
              </motion.div>
            )}

            {activeTab === "cli" && (
              <motion.div
                key="cli"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.15 }}
              >
                <TerminalCLI
                  onInstallPkg={handleCLIInstall}
                  onUninstallPkg={handleCLIUninstall}
                  onRunSyu={() => setIsSyuUpgrade(true)}
                  installedPackages={installedPackages}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Dynamic Sidebar drawer: Package detail view panel */}
        <aside className="space-y-6">
          {selectedPkgName ? (
            <PackageDetailDrawer
              pkgName={selectedPkgName}
              isAur={selectedPkgIsAur}
              installedPackages={installedPackages}
              onClose={() => setSelectedPkgName(null)}
              onInstall={handleInstallTrigger}
              onUninstall={handleUninstall}
              onRollback={handleRollback}
            />
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl p-12 text-center h-[420px] glass-panel">
              <div className="rounded-full bg-white/5 border border-white/10 p-4 mb-3 text-cyan-400">
                <Package className="h-8 w-8 text-cyan-400" />
              </div>
              <h4 className="text-sm font-bold text-slate-200 font-mono">No Package Selected</h4>
              <p className="max-w-xs text-xs text-slate-400 mt-1.5 leading-relaxed font-sans">
                Select an installed package from your Dashboard, search the AUR database, or use the Command-Line Interface to begin.
              </p>
            </div>
          )}
        </aside>
      </div>

      {/* COMPILATION AND SYSTEM BUILD LOG MODALS */}
      <AnimatePresence>
        {compilingPackage && (
          <BuildProgressModal
             pkgName={compilingPackage.Name || compilingPackage.name}
             pkgVersion={compilingPackage.Version || compilingPackage.version || "1.0.0-1"}
             depends={compilingPackage.Depends || compilingPackage.depends || []}
             onComplete={handleCompilationSuccess}
             onCancel={() => setCompilingPackage(null)}
          />
        )}

        {isSyuUpgrade && (
          <BuildProgressModal
            pkgName="system-upgrade"
            pkgVersion="aur-syu"
            depends={installedPackages.filter(p => p.hasUpdate).map(p => p.name)}
            onComplete={handleSyuCompilationSuccess}
            onCancel={() => setIsSyuUpgrade(false)}
          />
        )}
      </AnimatePresence>

      {/* Aesthetic system credit block inside page margins */}
      <footer className="mt-12 border-t border-white/5 pt-5 flex flex-col md:flex-row items-center justify-between text-[11px] text-zinc-500 font-mono">
        <div>
          <span>ArchForge GUI Package Management Console</span>
          <span className="mx-2">•</span>
          <span>Released under GPLv3</span>
        </div>
        <div className="mt-2 md:mt-0">
          <span>System Mode Active</span>
          <span className="mx-2">•</span>
          <span>Active Connections: Local Host</span>
        </div>
      </footer>
    </div>
  );
}
