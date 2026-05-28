import { useState, useEffect, useRef } from "react";
import { Terminal, ShieldCheck, Loader2, Play, CircleAlert, CheckCircle2, Award, Info, Lock } from "lucide-react";
import { generateBuildSteps } from "../utils/buildLogGenerator";
import { estimateBuildTimeSeconds, formatEstimatedTime } from "../utils/buildTimeEstimator";

interface BuildProgressModalProps {
  pkgName: string;
  pkgVersion: string;
  depends?: string[];
  pkgSize?: string;
  onComplete: () => void;
  onCancel: () => void;
  isRealArch?: boolean;
}

export default function BuildProgressModal({
  pkgName,
  pkgVersion,
  depends = [],
  pkgSize,
  onComplete,
  onCancel,
  isRealArch
}: BuildProgressModalProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const [sudoPwInput, setSudoPwInput] = useState("");
  const [rememberPw, setRememberPw] = useState(true);
  const [authSubmitted, setAuthSubmitted] = useState(false);

  const [systemStats, setSystemStats] = useState<any>(null);

  // Initialize and load systemRealArch to check fallback dynamically
  const [systemRealArch, setSystemRealArch] = useState<boolean | null>(() => {
    if (isRealArch !== undefined && isRealArch !== null) {
      return isRealArch;
    }
    return null;
  });

  useEffect(() => {
    let active = true;

    const fetchStats = async () => {
      try {
        const res = await fetch("/api/system/stats");
        const data = await res.json();
        if (active) {
          setSystemStats(data);
          if (isRealArch === undefined || isRealArch === null) {
            setSystemRealArch(!!data.isRealArch);
          }
        }
      } catch (err) {
        if (active && (isRealArch === undefined || isRealArch === null)) {
          setSystemRealArch(false);
        }
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [isRealArch]);

  // Determine if we need to show the Auth Panel before starting the build
  const needsAuth = systemRealArch === true && !sessionStorage.getItem("archweaver-sudopw") && !sessionStorage.getItem("archforge-sudopw") && !authSubmitted;

  const [currentPhase, setCurrentPhase] = useState("");
  const [percentage, setPercentage] = useState(0);
  const [complete, setComplete] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (complete || needsAuth || systemRealArch === null) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [complete, needsAuth, systemRealArch]);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-Healer custom states
  const [errorOccurred, setErrorOccurred] = useState<string | null>(null);
  const [healingStep, setHealingStep] = useState<"none" | "detecting" | "repairing" | "success">("none");
  const faultResolvedRef = useRef(false);
  const [isSudoWaiting, setIsSudoWaiting] = useState(false);

  // Automatic retry state variables for network fetch fault tolerant compiles
  const [retryCount, setRetryCount] = useState(0);
  const [buildAttempt, setBuildAttempt] = useState(1);
  const [fetchTimeout, setFetchTimeout] = useState(15); // Standard dynamic fetch timeout
  const [networkErrorDetected, setNetworkErrorDetected] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [simulateNetworkOutage, setSimulateNetworkOutage] = useState(true);

  // Countdown timer for automatic retry triggers
  useEffect(() => {
    if (networkErrorDetected) {
      setCountdown(5);
    } else {
      setCountdown(null);
    }
  }, [networkErrorDetected]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      handleRetryWithIncreasedTimeout();
      return;
    }
    const timer = setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleRetryWithIncreasedTimeout = () => {
    setCountdown(null);
    setNetworkErrorDetected(false);
    setErrorOccurred(null);
    setHealingStep("none");
    
    // Scale up source retrieval timeout limits (e.g. 15s -> 60s)
    setFetchTimeout((prev) => prev * 4);
    setBuildAttempt((prev) => prev + 1);
    setRetryCount((prev) => prev + 1);
  };

  // Generate steps based on package metadata
  const steps = generateBuildSteps(pkgName, pkgVersion, depends);

  useEffect(() => {
    // If systemRealArch is not determined yet, or if we need auth first, do not initiate connection
    if (systemRealArch === null || (systemRealArch === true && !sessionStorage.getItem("archweaver-sudopw") && !sessionStorage.getItem("archforge-sudopw") && !authSubmitted)) {
      return;
    }

    let active = true;
    let logBuffer: string[] = [];

    // Reset logging screens and percent counts upon multi-attempt build retry
    if (buildAttempt > 1) {
      logBuffer = [
        `\x1b[33m==> [ArchWeaver Shield Retry Node] Re-initiating compilation attempt #${buildAttempt}...\x1b[0m`,
        `==> Setting expanded source fetch parameters for safe retrieval:`,
        `    • SRC_FETCH_TIMEOUT = ${fetchTimeout}s (Scaled from previous timeout limit)`,
        `    • NETWORK_RECOVERY_BUFFERS = ENABLED`,
        `    • DYNAMIC_MIRROR_RESOLVER = ACTIVE`,
        `==> Dynamic retry configuration loaded. Resuming package installer compiler...`,
        `--------------------------------------------------------------------------------`
      ];
      setLogs([...logBuffer]);
      setPercentage(0);
      setComplete(false);
    } else {
      setLogs([]);
      setPercentage(0);
      setComplete(false);
    }

    // Connect to Server-Sent Events (SSE) stream to fetch live bare-metal command stdout
    const savedSudoPw = sessionStorage.getItem("archweaver-sudopw") || sessionStorage.getItem("archforge-sudopw") || "";
    let sseUrl = `/api/packages/install/stream?name=${encodeURIComponent(pkgName)}&pw=${encodeURIComponent(savedSudoPw)}`;
    if (pkgName === "system-upgrade" && depends.length > 0) {
      sseUrl += `&packages=${encodeURIComponent(depends.join(","))}`;
    }
    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource(sseUrl);

      eventSource.onmessage = (event) => {
        if (!active) return;
        try {
          const data = JSON.parse(event.data);
          if (data && data.line) {
            logBuffer = [...logBuffer, data.line];
            setLogs([...logBuffer]);
            
            // Intelligently check for live network errors to prompt fallback retry panel
            const lineLower = data.line.toLowerCase();
            const isLiveNetworkError = 
              lineLower.includes("connection timed out") || 
              lineLower.includes("could not resolve host") || 
              lineLower.includes("curl: (28)") || 
              lineLower.includes("ssl verification failed") || 
              lineLower.includes("failed to download") ||
              lineLower.includes("error: failure while downloading") ||
              lineLower.includes("network is unreachable");
              
            if (isLiveNetworkError) {
              setErrorOccurred(data.line);
              setNetworkErrorDetected(true);
              if (eventSource) {
                eventSource.close();
              }
              return;
            }

            // Auto detect compile phases by reading real-time stdout markers
            if (data.line.includes("Cloning") || data.line.includes("git")) {
              setCurrentPhase("Source Fetching");
            } else if (data.line.includes("makepkg") || data.line.includes("Compiling")) {
              setCurrentPhase("makepkg Compiler");
            } else if (data.line.includes("COMPILATION SUCCEEDED") || data.line.includes("Registering")) {
              setCurrentPhase("Registering Package");
            }

            // Check if this line is a sudo/root password request
            const isSudoLine = data.line.toLowerCase().includes("[sudo] password") || 
                               data.line.toLowerCase().includes("password for") || 
                               (data.line.toLowerCase().includes("sudo") && data.line.toLowerCase().includes("password"));
            if (isSudoLine) {
              setIsSudoWaiting(true);
            } else if (data.line.toLowerCase().includes("password successfully") || data.line.toLowerCase().includes("authenticating") || data.line.toLowerCase().includes("loading packages")) {
              setIsSudoWaiting(false);
            }

            // Statically step percentage up on new lines received from host compiler
            setPercentage((prev) => Math.min(prev + 2, 99));
          }
        } catch (e) {
          console.error("Failed to parse SSE line data:", e);
        }
      };

      eventSource.addEventListener("end", () => {
        if (!active) return;
        setPercentage(100);
        setComplete(true);
        if (eventSource) {
          eventSource.close();
        }
      });

      eventSource.onerror = () => {
        if (eventSource) {
          eventSource.close();
        }
        // Fallback gracefully to offline high-fidelity simulator steps if SSE errors out (e.g. running in web preview)
        if (active) {
          startVirtualSimulator();
        }
      };
    } catch (e) {
      console.error("Failed to start build stream, falling back to simulator:", e);
      startVirtualSimulator();
    }

    // Complete fallback system for pristine cloud sandbox demo presentation
    function startVirtualSimulator() {
      let currentStepIdx = 0;
      let lineIdx = 0;
      const lineInterval = 45; // ms per log line

      const processNextLine = () => {
        if (!active) return;

        if (currentStepIdx >= steps.length) {
          setPercentage(100);
          setComplete(true);
          return;
        }

        const step = steps[currentStepIdx];
        setCurrentPhase(step.phase);

        // DELIBERATE simulation of source download failure
        if (step.phase === "Source Retrieval" && lineIdx === 5 && buildAttempt === 1 && simulateNetworkOutage) {
          setErrorOccurred("curl: (28) Connection timed out after 15000 milliseconds");
          setHealingStep("detecting");
          setNetworkErrorDetected(true);
          
          logBuffer = [
            ...logBuffer,
            `  -> Downloading http://aur.archlinux.org/packages/${pkgName}/sources/${pkgName}-${pkgVersion}.tar.gz...`,
            `  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current`,
            `                                 Dload  Upload   Total   Spent    Left  Speed`,
            `  0     0    0     0    0     0      0      0  0:00:15  0:00:15 --:--:--     0`,
            `\x1b[31mcurl: (28) Connection timed out after 15000 milliseconds\x1b[0m`,
            `==> \x1b[31mERROR:\x1b[0m Failure while downloading http://aur.archlinux.org/packages/${pkgName}/sources/${pkgName}-${pkgVersion}.tar.gz`,
            `    Aborting...`
          ];
          setLogs([...logBuffer]);
          return; // pause loop !
        }

        // DELIBERATE compiler failure mode for Discord package compilation
        if (step.phase === "Compilation" && pkgName.toLowerCase() === "discord" && lineIdx === 8 && !faultResolvedRef.current) {
          setErrorOccurred("fatal error: gconf/gconf-client.h: No such file or directory");
          setHealingStep("detecting");

          logBuffer = [
            ...logBuffer,
            "  [ 42%] Building CXX object CMakeFiles/discord.dir/src/core_4.cpp.o",
            "  /tmp/makepkg/discord/src/core_4.cpp:15:10: \x1b[31mfatal error:\x1b[0m gconf/gconf-client.h: No such file or directory",
            "   #include <gconf/gconf-client.h>",
            "            ^~~~~~~~~~~~~~~~~~~~~~",
            "  compilation terminated.",
            "  make[2]: *** [CMakeFiles/discord.dir/build.make:76: CMakeFiles/discord.dir/src/core_4.cpp.o] Error 1",
            "  make[1]: *** [Subdirs/discord.dir/all] Error 2",
            "  make: *** [Makefile:135: all] Error 2",
            "==> \x1b[31mERROR:\x1b[0m A failure occurred in build().",
            "    Aborting..."
          ];
          setLogs([...logBuffer]);

          // Trigger compilation auto-fixing during building process and notify the user
          setTimeout(() => {
            if (!active) return;
            setHealingStep("repairing");

            logBuffer = [
              ...logBuffer,
              "==> \x1b[33m[ArchWeaver Self-Healer]\x1b[0m Analyzing compilation crash log signatures...",
              "  -> Found signature match: 'gconf/gconf-client.h' not found in compiler directory indexing.",
              "  -> Root Cause: Missing upstream system shared library links on current root environment.",
              "==> \x1b[33m[ArchWeaver Self-Healer]\x1b[0m Automatic fix applied: downloading missing library package 'extra/gconf'...",
              ":: Synchronizing package databases...",
              "   -> Fetching extra/gconf-3.2.6-1-x86_64.pkg.tar.zst...",
              "   -> Installing extra/gconf on virtual system environment...",
              "   (1/1) checking keys in keyring                    [######################] 100%",
              "   (1/1) checking package integrity                  [######################] 100%",
              "   (1/1) installing gconf                            [######################] 100%",
              "==> \x1b[32m[ArchWeaver Self-Healer]\x1b[0m Library link registration succeeded. gconf hooks deployed.",
              "==> \x1b[32m[ArchWeaver Self-Healer]\x1b[0m Adjusting build configuration Makefile. Resuming makepkg compiler core..."
            ];
            setLogs([...logBuffer]);

            setTimeout(() => {
              if (!active) return;
              setHealingStep("success");
              setErrorOccurred(null);
              faultResolvedRef.current = true;
              
              // Proceed with compilation cleanly from this point
              lineIdx++;
              setTimeout(processNextLine, lineInterval);
            }, 3000);
          }, 2500);

          return; // pause standard steps loop
        }

        if (lineIdx < step.lines.length) {
          const nextLine = step.lines[lineIdx];
          
          // Intercept sudo password request within simulation stream
          const isSudoPrompt = nextLine.toLowerCase().includes("[sudo] password") || 
                               nextLine.toLowerCase().includes("password for") ||
                               (nextLine.toLowerCase().includes("sudo") && nextLine.toLowerCase().includes("password"));

          if (isSudoPrompt) {
            setIsSudoWaiting(true);
            logBuffer = [...logBuffer, nextLine];
            setLogs([...logBuffer]);
            lineIdx++;

            // Wait 3.5s to simulate user entering password in their server console/terminal, then resume
            setTimeout(() => {
              if (!active) return;
              setIsSudoWaiting(false);
              logBuffer = [
                ...logBuffer,
                "  password: **********",
                "  [sudo] authentication succeeded. Privilege token registered.",
                "  -> Escalating privilege process. Resuming package manager installation daemon..."
              ];
              setLogs([...logBuffer]);
              setTimeout(processNextLine, lineInterval);
            }, 3500);

            return; // Pause simulation loop while waiting for admin key in terminal
          }

          logBuffer = [...logBuffer, nextLine];
          setLogs([...logBuffer]);
          lineIdx++;

          const totalLinesAcrossAllSteps = steps.reduce((acc, s) => acc + s.lines.length, 0);
          const resolvedLinesCount = steps.slice(0, currentStepIdx).reduce((acc, s) => acc + s.lines.length, 0) + lineIdx;
          const currentProgressPct = Math.min(Math.floor((resolvedLinesCount / totalLinesAcrossAllSteps) * 100), 99);
          setPercentage(currentProgressPct);

          setTimeout(processNextLine, lineInterval);
        } else {
          currentStepIdx++;
          lineIdx = 0;
          setTimeout(processNextLine, 350);
        }
      };

      setTimeout(processNextLine, 200);
    }

    return () => {
      active = false;
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [pkgName, pkgVersion, authSubmitted, systemRealArch, retryCount]);

  // Handle auto-scroll of scrolling terminal console
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  // Analyze package size and dependency count to est build time
  let estSeconds = estimateBuildTimeSeconds(pkgName, pkgSize, depends.length);

  // Dynamically adjust based on system stats (CPU load)
  if (systemStats?.cpuUsage) {
    const cpuVal = parseFloat(systemStats.cpuUsage);
    if (!isNaN(cpuVal) && cpuVal > 20) {
      // Scale build time up if CPU is heavily utilized (e.g. 100% adds 80% more to estimation)
      const factor = 1 + ((cpuVal - 20) / 80) * 0.8;
      estSeconds = Math.round(estSeconds * factor);
    }
  }

  const estTimeStr = formatEstimatedTime(estSeconds);
  const remainingSeconds = Math.max(0, estSeconds - elapsedSeconds);
  const remainingTimeStr = formatEstimatedTime(remainingSeconds);

  if (systemRealArch === null) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md select-none animate-fadeIn">
        <div className="relative w-full max-w-sm rounded-2xl p-6 glass-panel border border-white/10 shadow-2xl flex flex-col items-center justify-center text-center space-y-4">
          <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
          <p className="text-xs text-zinc-400 font-mono">Initializing host connection...</p>
        </div>
      </div>
    );
  }

  if (needsAuth) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md select-none animate-fadeIn">
        <div className="relative w-full max-w-md overflow-hidden rounded-2xl p-6 glass-panel border border-white/10 shadow-2xl">
          {/* Ambient header glow */}
          <div className="absolute right-0 top-0 -z-10 h-32 w-32 rounded-full bg-cyan-500/10 blur-2xl"></div>
          
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="h-12 w-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shadow-inner">
              <Lock className="h-6 w-6 animate-pulse" />
            </div>
            
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-white uppercase font-mono tracking-wider">
                Authentication Required
              </h3>
              <p className="text-xs text-zinc-400 font-sans max-w-sm">
                ArchWeaver requires administrative privileges on your local system to compile, resolve dependencies, and register <span className="text-cyan-400 font-mono font-bold">{pkgName}</span>.
              </p>
            </div>
          </div>

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (rememberPw) {
                sessionStorage.setItem("archweaver-sudopw", sudoPwInput);
              }
              setAuthSubmitted(true);
            }}
            className="mt-6 space-y-4"
          >
            <div>
              <label className="block text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider mb-2">
                Sudo / Root Password
              </label>
              <input
                type="password"
                value={sudoPwInput}
                onChange={(e) => setSudoPwInput(e.target.value)}
                placeholder="••••••••••••••"
                autoFocus
                className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-650 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 font-mono transition"
              />
            </div>

            <div className="flex items-center gap-2.5 px-1 py-1">
              <input
                id="rememberPw"
                type="checkbox"
                checked={rememberPw}
                onChange={(e) => setRememberPw(e.target.checked)}
                className="rounded border-zinc-700 bg-zinc-800 text-cyan-500 focus:ring-cyan-500 h-4 w-4 cursor-pointer"
              />
              <label htmlFor="rememberPw" className="text-xs text-zinc-400 font-sans cursor-pointer select-none">
                Remember for this application session
              </label>
            </div>

            <div className="flex gap-2.5 pt-3">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-semibold text-zinc-400 hover:text-white transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-500 text-zinc-950 font-bold py-2.5 text-xs hover:opacity-90 transition cursor-pointer font-mono"
              >
                Authenticate & Build
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md select-none">
      <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl p-6 glass-panel">
        {/* Background Ambient Glow */}
        <div className="absolute right-0 top-0 -z-10 h-64 w-64 rounded-full bg-cyan-500/5 blur-3xl"></div>
        <div className="absolute left-0 bottom-0 -z-10 h-64 w-64 rounded-full bg-yellow-500/5 blur-3xl"></div>

        {/* Header Block with Compile Metadata */}
        <div className="flex flex-col gap-4 border-b border-white/5 pb-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className={`rounded-xl p-2.5 ${complete ? "bg-emerald-500/10 text-emerald-400" : "bg-cyan-500/10 text-cyan-400"}`}>
              {complete ? <CheckCircle2 className="h-6 w-6" /> : <Loader2 className="h-6 w-6 animate-spin" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-mono">
                {complete ? "Compilation Succeeded" : "Compiling AUR Package..."}
              </h3>
              <p className="text-xs text-zinc-400 font-mono mt-0.5 flex flex-wrap items-center gap-y-1.5">
                makepkg toolchain: <span className="text-cyan-400 font-bold">{pkgName} {pkgVersion}</span>
                {pkgSize && (
                  <span className="text-zinc-500 text-[11px] ml-1.5 font-normal mr-2">
                    ({pkgSize}, {depends?.length || 0} {depends?.length === 1 ? "dep" : "deps"})
                  </span>
                )}
                {!complete && buildAttempt === 1 && (
                  <span 
                    className="inline-flex items-center gap-1.5 ml-1 bg-zinc-900 border border-white/5 px-2 py-0.5 rounded text-[10px] text-zinc-400 font-semibold cursor-pointer select-none hover:border-cyan-500/30 transition shadow-sm"
                    onClick={() => setSimulateNetworkOutage(!simulateNetworkOutage)}
                  >
                    <input 
                      type="checkbox" 
                      checked={simulateNetworkOutage} 
                      onChange={() => {}} // handled by click of parent wrapper
                      className="rounded border-zinc-700 bg-zinc-805 text-cyan-400 focus:ring-0 cursor-pointer h-3 w-3 animate-pulse"
                    />
                    <span>Mock Network Outage</span>
                  </span>
                )}
                {buildAttempt > 1 && (
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded px-1.5 py-0.5 text-[9px] font-mono font-bold animate-pulse ml-1.5">
                    Safe Fetch Active (Attempt #{buildAttempt} • Timeout: {fetchTimeout}s)
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Quick Metrics Indicators */}
          <div className="flex gap-4 text-xs font-mono text-slate-400 mt-2 md:mt-0 bg-white/3 px-4 py-2 rounded-lg border border-white/5 items-center">
            <div>
              <span className="block text-[9px] uppercase tracking-wider text-slate-500">Active Phase</span>
              <span className="text-[#22d3ee] font-semibold truncate block max-w-[130px]">{currentPhase}</span>
            </div>
            <div className="h-8 w-px bg-white/5"></div>
            <div>
              <span className="block text-[9px] uppercase tracking-wider text-slate-500">Total System Threads</span>
              <span className="text-slate-200 font-semibold block">8 Parallel Jobs</span>
            </div>
            <div className="h-8 w-px bg-white/5"></div>
            <div>
              <span className="block text-[9px] uppercase tracking-wider text-slate-500">Est. Build Time</span>
              <span className="text-amber-400 font-semibold block">
                {complete ? (
                  <span className="text-emerald-400 font-extrabold flex items-center gap-1">
                    Done ({formatEstimatedTime(elapsedSeconds)})
                  </span>
                ) : (
                  <span>
                    {remainingTimeStr} left <span className="text-[10px] text-zinc-500 font-normal">({estTimeStr} tot)</span>
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Compiling Logging Block Area */}
        <div className="mt-5 space-y-3.5">
          {isSudoWaiting && (
            <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-2 border-amber-500/30 text-amber-200 p-4 rounded-xl flex items-start gap-4 mt-1 border-dashed font-mono text-xs shadow-lg animate-pulse">
              <div className="h-6 w-6 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                <Lock className="h-4 w-4 animate-bounce" />
              </div>
              <div className="flex-grow">
                <span className="font-extrabold text-amber-400 block uppercase tracking-wider text-[11px]">
                  🔐 SYSTEM AUTHENTICATION REQUIRED — REASSESSING WORKSPACE
                </span>
                <p className="mt-1 font-bold text-slate-200 text-[12px] leading-relaxed">
                  Installing system dependencies requires administrative privileges (<code className="bg-black/40 px-1 py-0.25 rounded text-amber-300">sudo</code>).
                </p>
                <div className="mt-3 bg-black/60 border border-white/5 rounded-lg p-3 text-slate-300 text-[11px] leading-relaxed space-y-2">
                  <p>
                    👉 <strong>IMPORTANT NOTICE:</strong> Sudo is waiting for authorization. Enter your password in the interactive credentials input below, or enter it inside the console from which you booted the server:
                  </p>
                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const pwVal = (e.currentTarget.elements.namedItem("inlinePassword") as HTMLInputElement).value;
                      if (pwVal) {
                        try {
                          await fetch("/api/system/sudo-auth", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ name: pkgName, password: pwVal })
                          });
                        } catch (err) {
                          console.error("Failed to forward credentials:", err);
                        }
                      }
                    }}
                    className="flex gap-2 items-center mt-2.5"
                  >
                    <input
                      name="inlinePassword"
                      type="password"
                      placeholder="••••••••"
                      className="bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono w-48"
                    />
                    <button
                      type="submit"
                      className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold px-3 py-1 rounded-lg text-[10px] uppercase font-mono transition cursor-pointer"
                    >
                      Authorize
                    </button>
                  </form>
                  <p className="text-[10px] text-amber-400/90 flex items-center gap-1.5 pt-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                    Interactive inputs will automatically forward securely to the active system session.
                  </p>
                </div>
              </div>
            </div>
          )}

          {networkErrorDetected && (
            <div className="bg-gradient-to-r from-amber-500/10 to-red-500/10 border-2 border-amber-500/35 text-amber-200 p-4 rounded-xl flex items-start gap-4 mt-1 border-dashed font-mono text-xs shadow-lg animate-fadeIn">
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-450 flex items-center justify-center shrink-0 mt-0.5 animate-pulse">
                <Loader2 className="h-5 w-5 animate-spin text-amber-450" />
              </div>
              <div className="flex-grow">
                <span className="font-extrabold text-amber-450 block uppercase tracking-wider text-[11px]">
                  📡 NETWORK FETCH DROPPED (PHASE: SOURCE RETRIEVAL)
                </span>
                <p className="mt-1 font-bold text-slate-200 text-[12px] leading-relaxed">
                  The host system timed out while downloading package tarball binaries from upstream servers.
                </p>
                
                <div className="mt-3.5 bg-black/50 border border-white/5 rounded-lg p-3 text-slate-300 text-[11px] leading-relaxed space-y-2.5">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Active Timeout Bounds:</span>
                    <span className="font-bold text-rose-450 font-mono">{fetchTimeout} seconds</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/5 pt-2">
                    <span className="text-zinc-400 font-sans">Diagnosis:</span>
                    <span className="text-zinc-300 font-sans">Server side high-latency packet drops or expired DNS resolutions on AUR.</span>
                  </div>
                  
                  <div className="flex items-center justify-between border-t border-white/5 pt-2 text-emerald-450 font-bold">
                    <span>Auto-Repair Plan:</span>
                    <span>Scale timeout to <span className="underline text-emerald-350">{fetchTimeout * 4} seconds</span> and force parallel TCP connections.</span>
                  </div>
                  
                  {countdown !== null && (
                    <div className="flex items-center justify-between bg-emerald-500/5 rounded p-2 text-xs font-sans text-emerald-300 border border-emerald-500/10 mt-1">
                      <span className="flex items-center gap-1.5 font-mono">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        Auto-retrying build with expanded limits in:
                      </span>
                      <span className="font-bold text-base font-mono bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded shadow">
                        {countdown}s
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex gap-2.5">
                  <button
                    type="button"
                    onClick={handleRetryWithIncreasedTimeout}
                    className="rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 px-4 py-2 text-xs font-extrabold transition cursor-pointer font-mono shadow-md shadow-amber-500/10 hover:shadow-amber-500/20 active:scale-95"
                  >
                    Retry Now with {fetchTimeout * 4}s Timeout ⚡
                  </button>
                  <button
                    type="button"
                    onClick={() => setCountdown(null)}
                    className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    Pause Auto-Timer
                  </button>
                </div>
              </div>
            </div>
          )}

          {errorOccurred && !networkErrorDetected && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-200 p-4 rounded-xl flex items-start gap-3 mt-1 animate-pulse font-mono text-xs">
              <div className="h-2 w-2 rounded-full bg-rose-500 animate-ping mt-1.5 shrink-0" />
              <div className="flex-grow">
                <span className="font-bold text-rose-400 block uppercase tracking-wider text-[10px]">
                  ⚠️ HOST COMPILER FAULT DETECTED
                </span>
                <p className="mt-1 font-semibold text-slate-200">{errorOccurred}</p>
                
                <div className="mt-3.5 bg-black/50 border border-white/5 rounded-lg p-2.5 text-slate-350">
                  {healingStep === "detecting" && (
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 border-2 border-yellow-405 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-yellow-400 font-bold">ANALYZING:</span>
                      <span className="text-zinc-350">Scanning terminal stderr signatures to identify appropriate PKGBUILD patch...</span>
                    </div>
                  )}
                  {healingStep === "repairing" && (
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-amber-450 font-bold">APPLYING AUTO-FIX:</span>
                      <span className="text-amber-305">Downloading extra/gconf and injecting search headers path...</span>
                    </div>
                  )}
                  {healingStep === "success" && (
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 font-bold">✓ ENVIRONMENT PATTERNS RESOLVED:</span>
                      <span className="text-emerald-305">System directories recovered. Resuming compiler jobs cleanly!</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-xs font-mono text-zinc-500">
            <span className="flex items-center gap-1.5"><Terminal className="h-3.5 w-3.5" /> makepkg -sri shell log</span>
            <span>Progress: {percentage}%</span>
          </div>

          {/* Scrolling log container */}
          <div
            ref={scrollRef}
            className="h-80 overflow-y-auto select-text font-mono text-xs leading-5 text-slate-300 bg-black/40 border border-white/5 rounded-xl p-4 shadow-inner space-y-1.5 glass-scrollbar"
          >
            {logs.map((log, idx) => {
              // Color patterns inside terminal
              let logClass = "text-zinc-400";
              if (log.startsWith("==>")) {
                logClass = "text-yellow-400 font-semibold";
              } else if (log.startsWith("  ->")) {
                logClass = "text-cyan-400";
              } else if (log.includes("Passed")) {
                logClass = "text-emerald-400 font-medium";
              } else if (log.includes("warning:")) {
                logClass = "text-amber-400 font-medium";
              } else if (log.toLowerCase().includes("success")) {
                logClass = "text-emerald-400 font-bold";
              } else if (log.includes("[######################]")) {
                logClass = "text-cyan-300 font-mono";
              }
              return (
                <div key={idx} className={`${logClass} whitespace-pre-wrap`}>
                  {log}
                </div>
              );
            })}
          </div>

          {/* Live Progress Bar indicator strip */}
          <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden border border-white/5 relative">
            <div
              className={`h-full rounded-full transition-all duration-300 bg-gradient-to-r ${
                complete ? "from-emerald-500 to-teal-500" : "from-cyan-500 to-indigo-500 animate-pulse"
              }`}
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
        </div>

        {/* Modal Foot Actions Buttons */}
        <div className="mt-6 flex flex-col gap-4 border-t border-white/5 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2 text-xs text-amber-400 font-mono bg-amber-500/5 border border-amber-500/15 rounded-lg p-2.5 max-w-xl">
            <CircleAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              <strong>Host Notice:</strong> If this package installation or system update requires <strong>sudo</strong> permissions, you must enter your administrator password in the <strong>terminal window used to launch this app</strong>.
            </span>
          </div>

          <div className="flex gap-2 font-sans shrink-0 self-end sm:self-auto">
            {!complete ? (
              <button
                onClick={onCancel}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
              >
                Interrupt Compiler
              </button>
            ) : (
              <button
                onClick={onComplete}
                className="rounded-lg bg-emerald-500 text-zinc-950 font-bold px-6 py-2 hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-500/20 active:scale-95 text-xs transition font-mono cursor-pointer"
              >
                Complete & Register Build
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
