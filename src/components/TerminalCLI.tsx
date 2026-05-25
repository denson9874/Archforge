import { useState, useRef, useEffect } from "react";
import { Terminal, Send, HelpCircle, ShieldAlert } from "lucide-react";

interface TerminalCLIProps {
  onInstallPkg: (name: string) => void;
  onUninstallPkg: (name: string) => void;
  onRunSyu: () => void;
  installedPackages: any[];
}

export default function TerminalCLI({
  onInstallPkg,
  onUninstallPkg,
  onRunSyu,
  installedPackages
}: TerminalCLIProps) {
  const [command, setCommand] = useState("");
  const [history, setHistory] = useState<string[]>([
    "Arch Linux core kernel initialized. Welcome to AUR Power-User Console.",
    "Type 'help' to see available system tools."
  ]);
  const consoleContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (consoleContainerRef.current) {
      consoleContainerRef.current.scrollTop = consoleContainerRef.current.scrollHeight;
    }
  }, [history]);

  const executeCommand = async (cmdText: string) => {
    const trimmed = cmdText.trim();
    if (!trimmed) return;

    // Append to CLI listing
    const userPromptLine = `[user@archlinux ~]$ ${trimmed}`;
    const newHistory = [...history, userPromptLine];

    const parts = trimmed.split(/\s+/);
    const cmdBase = parts[0].toLowerCase();

    let outputLines: string[] = [];

    switch (cmdBase) {
      case "help":
        outputLines = [
          "Available AUR/Pacman Interactive Commands:",
          "  yay -S <pkg_name>   - Build and install library packages automatically",
          "  yay -Syu            - Synchronize databases and compile all upgrades",
          "  yay -Ss <search>    - Locate and query packages in AUR RPC database",
          "  pacman -Q           - List currently installed system applications",
          "  pacman -Qi <pkg>    - Inspect local system records for installed items",
          "  pacman -R <pkg>     - Purge and remove package from root filesystem",
          "  clear               - Empty the terminal buffer logs",
          "  help                - Display this software usage index"
        ];
        break;

      case "clear":
        setHistory([]);
        setCommand("");
        return;

      case "pacman": {
        const flag = parts[1];
        if (!flag) {
          outputLines = ["error: no operation specified (use -h for help)"];
        } else if (flag === "-Q") {
          outputLines = [
            `Local package repository database contains ${installedPackages.length} packages:`,
            ...installedPackages.map(p => `  ${p.repo}/${p.name} ${p.version} [installed] - ${p.description.slice(0, 50)}...`)
          ];
        } else if (flag === "-Qi") {
          const pkgName = parts[2];
          if (!pkgName) {
            outputLines = ["error: no package targets specified"];
          } else {
            const found = installedPackages.find(p => p.name.toLowerCase() === pkgName.toLowerCase());
            if (found) {
              outputLines = [
                `Name            : ${found.name}`,
                `Version         : ${found.version}`,
                `Description     : ${found.description}`,
                `Architecture    : x86_64`,
                `URL             : ${found.url || "N/A"}`,
                `Licenses        : ${found.license || "GPL"}`,
                `Groups          : None`,
                `Provides        : None`,
                `Depends On      : None`,
                `Required By     : None`,
                `Optional For    : None`,
                `Conflicts With  : None`,
                `Replaces        : None`,
                `Installed Size  : ${found.size}`,
                `Packager        : ${found.maintainer || "Arch User"}`,
                `Build Date      : ${new Date(found.installedAt).toLocaleString()}`,
                `Install Reason  : Explicitly installed`,
                `Install Script  : No`,
                `Validated By    : SHA256 sum`
              ];
            } else {
              outputLines = [`error: package '${pkgName}' was not found`];
            }
          }
        } else if (flag === "-R") {
          const pkgName = parts[2];
          if (!pkgName) {
            outputLines = ["error: no package targets specified"];
          } else {
            const found = installedPackages.find(p => p.name.toLowerCase() === pkgName.toLowerCase());
            if (found) {
              outputLines = [
                `checking dependencies...`,
                `Packages (1) ${found.name}-${found.version}`,
                `Total Removed Size: ${found.size}`,
                `:: Purging system binaries... dispatching GUI removal thread.`
              ];
              // Dispatch to GUI
              setTimeout(() => {
                onUninstallPkg(found.name);
              }, 400);
            } else {
              outputLines = [`error: package '${pkgName}' was not found`];
            }
          }
        } else {
          outputLines = [`error: operation '${flag}' not supported by standard gui terminal`];
        }
        break;
      }

      case "yay": {
        const flag = parts[1];
        if (!flag) {
          outputLines = ["yay: error: no operation specified. Try 'yay --help' for options."];
        } else if (flag === "-syu" || flag === "-Syu") {
          outputLines = [
            ":: Synchronizing repository libraries...",
            ":: Starting system package compiler and dependencies sync..."
          ];
          setTimeout(() => {
            onRunSyu();
          }, 400);
        } else if (flag === "-s" || flag === "-S") {
          const targetPkg = parts[2];
          if (!targetPkg) {
            outputLines = ["error: no package specified."];
          } else {
            outputLines = [
              `:: Processing installation target: ${targetPkg}...`,
              `:: Resolving build flags and PKGBUILD...`,
              `:: Dispatching build through AUR Terminal helper...`
            ];
            setTimeout(() => {
              onInstallPkg(targetPkg);
            }, 600);
          }
        } else if (flag === "-ss" || flag === "-Ss") {
          const searchArg = parts[2];
          if (!searchArg) {
            outputLines = ["error: search query is required"];
          } else {
            outputLines = [`Querying AUR database index for: "${searchArg}"... Please wait.`];
            try {
              const res = await fetch(`/api/aur/search?q=${encodeURIComponent(searchArg)}`);
              const data = await res.json();
              if (data.results && data.results.length > 0) {
                outputLines = [
                  `AUR RPC search returned ${data.results.length} results:`,
                  ...data.results.map((r: any) => 
                    `aur/${r.Name} \x1b[32m${r.Version}\x1b[0m (+${r.NumVotes} ${r.Popularity.toFixed(1)}%)\n    ${r.Description}`
                  )
                ];
              } else {
                outputLines = [`no packages match standard search phrase: "${searchArg}"`];
              }
            } catch (err) {
              outputLines = ["error: could not contact AUR RPC endpoint, standard fallback offline"];
            }
          }
        } else {
          outputLines = [`yay: error: support for action '${flag}' is not implemented in terminal helper`];
        }
        break;
      }

      default:
        outputLines = [
          `bash: command not found: ${cmdBase}`,
          "Type 'help' to see supported package manager utilities."
        ];
    }

    setHistory([...newHistory, ...outputLines]);
    setCommand("");
  };

  const handleKeyDown = (e: any) => {
    if (e.key === "Enter") {
      executeCommand(command);
    }
  };

  return (
    <div className="flex h-[500px] flex-col rounded-xl p-4 glass-panel">
      {/* Visual Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-2 animate-fadeIn">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-cyan-400" />
          <span className="font-mono text-xs font-semibold text-slate-200">ArchLinux CLI Power-Shell (yay & pacman emulator)</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-mono">
          <HelpCircle className="h-3 w-3" />
          <span>Type &quot;help&quot;</span>
        </div>
      </div>

      {/* Output Console Buffer */}
      <div 
        ref={consoleContainerRef}
        className="flex-1 overflow-y-auto select-text font-mono text-xs leading-5 text-slate-300 space-y-1 glass-scrollbar pr-1"
      >
        {history.map((line, idx) => {
          let lineClass = "";
          if (line.includes("[user@archlinux ~]$")) {
            lineClass = "text-cyan-400 font-semibold";
          } else if (line.startsWith("::") || line.startsWith("==>")) {
            lineClass = "text-yellow-400";
          } else if (line.startsWith("error:") || line.includes("command not found")) {
            lineClass = "text-rose-400 font-medium";
          } else if (line.includes("[installed]")) {
            lineClass = "text-emerald-400";
          }
          
          return (
            <div key={idx} className={`${lineClass} whitespace-pre-wrap`}>
              {line}
            </div>
          );
        })}
      </div>

      {/* Input Field Form */}
      <div className="mt-3 flex items-center gap-2 border-t border-white/5 pt-3">
        <span className="font-mono text-xs text-cyan-400 font-semibold select-none">[user@archlinux ~]$</span>
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="yay -S spotify, pacman -Q, yay -Syu..."
          className="flex-1 bg-transparent font-mono text-sm text-white border-0 outline-none focus:ring-0 focus:outline-none p-0 placeholder-zinc-500"
          id="terminal-command-input"
        />
        <button
          onClick={() => executeCommand(command)}
          className="rounded p-1.5 text-zinc-400 hover:text-cyan-400 transition cursor-pointer"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
