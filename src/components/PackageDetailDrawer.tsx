import { useState, useEffect } from "react";
import { X, Globe, Download, Trash, BookOpen, Clock, GitCommit, FileText, ChevronRight, Share2, CornerDownLeft, ShieldCheck, AlertCircle } from "lucide-react";
import { AurSearchResult, InstalledPackage } from "../types";

interface PackageDetailDrawerProps {
  pkgName: string;
  isAur: boolean;
  installedPackages: InstalledPackage[];
  onClose: () => void;
  onInstall: (pkgMetadata: any) => void;
  onUninstall: (name: string) => void;
  onRollback: (name: string, targetVersion: string) => void;
}

export default function PackageDetailDrawer({
  pkgName,
  isAur,
  installedPackages,
  onClose,
  onInstall,
  onUninstall,
  onRollback
}: PackageDetailDrawerProps) {
  const [loading, setLoading] = useState(true);
  const [metadata, setMetadata] = useState<any>(null);
  const [pkgbuild, setPkgbuild] = useState("");
  const [viewMode, setViewMode] = useState<"details" | "pkgbuild" | "deps" | "rollback">("details");
  const [selectedRollbackVersion, setSelectedRollbackVersion] = useState("");

  const localPkg = installedPackages.find(p => p.name.toLowerCase() === pkgName.toLowerCase());

  // Fetch PKGBUILD & AUR RPC Metadata
  useEffect(() => {
    const fetchPackageDetails = async () => {
      setLoading(true);
      try {
        // Fetch Metadata
        const metaRes = await fetch(`/api/aur/info?name=${encodeURIComponent(pkgName)}`);
        const metaData = await metaRes.json();
        setMetadata(metaData);

        // Fetch PKGBUILD
        const pkgbuildRes = await fetch(`/api/aur/pkgbuild?name=${encodeURIComponent(pkgName)}`);
        const pkgbuildData = await pkgbuildRes.json();
        setPkgbuild(pkgbuildData.pkgbuild || "");

        // Select initial rollback version if historical list exists
        if (localPkg?.history && localPkg.history.length > 0) {
          setSelectedRollbackVersion(localPkg.history[0]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPackageDetails();
  }, [pkgName, localPkg]);

  // Clean dependency solver generator
  const getDepsTree = () => {
    if (!metadata) return [];
    const deps = metadata.Depends || [];
    const makeDeps = metadata.MakeDepends || [];
    return [
      { name: "Build Toolchain", items: ["git", "gcc", "make", ...makeDeps] },
      { name: "Shared Libraries", items: [...deps] }
    ];
  };

  const getRollbackOptions = () => {
    if (!localPkg?.history) return [];
    return localPkg.history.filter(v => v !== localPkg.version);
  };

  const depsTree = getDepsTree();
  const rollbackOptions = getRollbackOptions();

  return (
    <div className="flex h-full flex-col rounded-xl p-5 relative overflow-hidden glass-panel">
      {/* Drawer Head */}
      <div className="flex items-start justify-between border-b border-white/5 pb-4">
        <div>
          <span className="text-[10px] font-bold font-mono tracking-widest text-cyan-400 uppercase bg-cyan-950/40 border border-cyan-800/40 px-2 py-0.5 rounded">
            {isAur ? "AUR COMPILABLE" : "BINARY REPOSITORY"}
          </span>
          <h2 className="text-xl font-bold text-white font-mono mt-1.5">{pkgName}</h2>
          <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
            {metadata?.Description || localPkg?.description || "Locating dependencies indices..."}
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg border border-white/10 bg-white/5 w-max p-1.5 text-slate-400 hover:text-white transition cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400 font-mono text-xs">
          <div className="h-6 w-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-3"></div>
          Reading Package PKGBUILD & resolving indices...
        </div>
      ) : (
        <>
          {/* Inner Tab Menu Switch */}
          <div className="flex gap-1.5 glass-pill-container p-1 rounded-xl mt-4">
            <button
              onClick={() => setViewMode("details")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold font-mono transition cursor-pointer ${
                viewMode === "details" ? "bg-white/10 text-cyan-400 font-bold border border-white/5" : "text-slate-400 hover:text-white"
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setViewMode("pkgbuild")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold font-mono transition cursor-pointer ${
                viewMode === "pkgbuild" ? "bg-white/10 text-cyan-400 font-bold border border-white/5" : "text-slate-400 hover:text-white"
              }`}
            >
              PKGBUILD
            </button>
            <button
              onClick={() => setViewMode("deps")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold font-mono transition cursor-pointer ${
                viewMode === "deps" ? "bg-white/10 text-cyan-400 font-bold border border-white/5" : "text-slate-400 hover:text-white"
              }`}
            >
              Resolve ({depsTree.flatMap(g => g.items).length})
            </button>
            {localPkg && rollbackOptions.length > 0 && (
              <button
                onClick={() => setViewMode("rollback")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold font-mono transition cursor-pointer ${
                  viewMode === "rollback" ? "bg-white/10 text-amber-400 font-bold border border-white/5" : "text-slate-400 hover:text-white"
                }`}
              >
                Rollback
              </button>
            )}
          </div>

          {/* Tab Pages Workspace */}
          <div className="flex-1 overflow-y-auto max-h-[300px] mt-4 pr-1 space-y-4 text-xs glass-scrollbar">
            {viewMode === "details" && (
              <div className="space-y-4">
                {/* Meta details list */}
                <div className="grid grid-cols-2 gap-3.5 bg-white/3 p-3 rounded-lg border border-white/5 font-mono">
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase">Official Version</span>
                    <span className="text-slate-200 font-semibold">{metadata?.Version || localPkg?.version || "1.0.0"}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase">Maintainer</span>
                    <span className="text-cyan-400 font-semibold truncate block">{metadata?.Maintainer || localPkg?.maintainer || "orphan"}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase">License</span>
                    <span className="text-slate-200 font-semibold truncate block">{(metadata?.License || []).join(", ") || localPkg?.license || "GPL"}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase">Last Updated</span>
                    <span className="text-slate-200 font-semibold">
                      {metadata?.LastModified ? new Date(metadata.LastModified * 1000).toLocaleDateString() : "Up to date"}
                    </span>
                  </div>
                </div>

                {/* Local Instance Health Banner */}
                {localPkg && (
                  <div className={`flex gap-3 rounded-lg border p-3 font-mono ${
                    localPkg.health === "healthy" ? "bg-emerald-950/20 border-emerald-900/35 text-emerald-300" :
                    localPkg.health === "warning" ? "bg-amber-950/20 border-amber-900/35 text-amber-400" :
                    "bg-rose-950/20 border-rose-900/35 text-rose-300"
                  }`}>
                    {localPkg.health === "healthy" ? <ShieldCheck className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0 animate-pulse" />}
                    <div>
                      <span className="font-bold flex items-center justify-between">
                        <span>Local Installation State: {localPkg.health.toUpperCase()}</span>
                      </span>
                      <p className="text-[10px] text-zinc-400 mt-1">
                        {localPkg.healthDetails || "The local integrity matches online checksum validation tables. Operation normal."}
                      </p>
                      <p className="text-[10px] text-zinc-500 font-normal mt-1 flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        Installed on {new Date(localPkg.installedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                {/* Description & Website */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono">Package Description</span>
                  <p className="text-slate-300 leading-relaxed font-sans text-xs">
                    {metadata?.Description || localPkg?.description || "No extensive description provided for this software module."}
                  </p>
                  {(metadata?.URL || localPkg?.url) && (
                    <a
                      href={metadata?.URL || localPkg?.url}
                      target="_blank"
                      rel="referrer noopener"
                      className="inline-flex items-center gap-1.5 font-semibold text-cyan-400 hover:underline hover:text-cyan-300 font-mono mt-1"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      Visit Upstream Website
                    </a>
                  )}
                </div>
              </div>
            )}

            {viewMode === "pkgbuild" && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-zinc-500 font-mono">
                  <span>PKGBUILD Script Template</span>
                  <span className="text-[9px] text-cyan-500/80 lowercase">makepkg template</span>
                </div>
                <pre className="overflow-x-auto rounded-lg border border-white/5 bg-white/3 p-4 font-mono text-[11px] leading-5 text-slate-300 max-h-[220px] select-text">
                  <code>{pkgbuild}</code>
                </pre>
              </div>
            )}

            {viewMode === "deps" && (
              <div className="space-y-4">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono block">
                  Interactive Dependency Tree Resolution
                </span>

                {/* Flow solver visual diagram components */}
                <div className="relative rounded-xl border border-white/5 bg-white/2 p-4 font-mono">
                  <div className="flex flex-col items-center gap-2">
                    {/* Root Package */}
                    <div className="flex items-center gap-2 rounded-lg bg-cyan-950/60 border border-cyan-800/80 px-4 py-2 text-cyan-300 font-semibold shadow-xl">
                      <GitCommit className="h-4 w-4" />
                      {pkgName}
                    </div>

                    <div className="h-4 w-0.5 bg-zinc-750"></div>

                    {/* Groups container */}
                    <div className="grid grid-cols-2 gap-4 w-full">
                      {depsTree.map((g, gi) => (
                        <div key={gi} className="rounded-lg bg-white/3 border border-white/5 p-2.5 flex flex-col items-center relative">
                          <span className="text-[10px] text-zinc-400 mb-2 truncate font-semibold uppercase">{g.name}</span>
                          <div className="space-y-1.5 w-full">
                            {g.items.length > 0 ? (
                              g.items.slice(0, 4).map((it, iii) => (
                                <div key={iii} className="flex items-center gap-1.5 rounded bg-white/2 border border-white/5 px-2 py-1 text-[10px] text-slate-300">
                                  <ChevronRight className="h-3 w-3 text-cyan-500/60 shrink-0" />
                                  <span className="truncate">{it}</span>
                                </div>
                              ))
                            ) : (
                              <p className="text-[10px] text-zinc-600 italic">No dependencies found</p>
                            )}
                            {g.items.length > 4 && (
                              <div className="text-[9px] text-zinc-500 italic text-center pt-1">
                                + {g.items.length - 4} other dependencies
                              </div>
                            )}
                          </div>
                          {/* Anchor connector line */}
                          <div className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 bg-zinc-700 -translate-y-4 hidden sm:block"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {viewMode === "rollback" && (
              <div className="space-y-4 font-mono">
                <div className="rounded-lg border border-amber-900/35 bg-amber-950/10 p-3 flex gap-2.5 text-amber-300">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <div>
                    <span className="font-bold">Rollback Protection Manager</span>
                    <p className="text-[10px] text-zinc-400 mt-1 leading-normal">
                      Reverting a package to an older local build avoids upstream regression bugs. This installs the cached build package compiled on your filesystem disk storage.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 block">Select Historical Build Directory Cache</span>
                  <div className="flex gap-2.5">
                    <select
                      value={selectedRollbackVersion}
                      onChange={(e) => setSelectedRollbackVersion(e.target.value)}
                      className="flex-1 text-sm outline-none font-mono glass-input rounded-lg px-3 py-1.5"
                      id="rollback-version-selector"
                    >
                      {rollbackOptions.map((v, i) => (
                        <option key={i} value={v} className="bg-[#0b0e14]">Build Version: {v}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => onRollback(pkgName, selectedRollbackVersion)}
                      className="rounded-lg bg-amber-500 text-zinc-950 font-bold px-4 py-1.5 transition hover:bg-amber-400 hover:shadow-lg hover:shadow-amber-500/10 active:scale-95 text-xs text-center cursor-pointer font-sans"
                    >
                      Execute Rollback
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Footer Button Group */}
          <div className="flex items-center gap-3 border-t border-white/5 pt-4 mt-4">
            {localPkg ? (
              <>
                {/* Package is installed, provide update or uninstall */}
                {localPkg.hasUpdate ? (
                  <button
                    onClick={() => onInstall(metadata || { Name: pkgName, Version: localPkg.newVersion || "1.0.1", Description: localPkg.description, isAur })}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500 font-bold text-zinc-950 pb-2.5 pt-2.5 hover:bg-emerald-400 shadow-xl shadow-emerald-500/10 active:scale-95 transition text-xs font-mono cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    Clean Update (v{localPkg.newVersion})
                  </button>
                ) : (
                  <button
                    onClick={() => onInstall(metadata || { Name: pkgName, Version: localPkg.version, Description: localPkg.description, isAur })}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-white/5 font-bold text-white pb-2.5 pt-2.5 border border-white/10 hover:bg-white/10 active:scale-95 transition text-xs font-mono cursor-pointer"
                  >
                    <Share2 className="h-4 w-4 text-cyan-405" />
                    Recompile / Reinstall
                  </button>
                )}

                <button
                  onClick={() => onUninstall(pkgName)}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold px-4 pb-2.5 pt-2.5 hover:bg-rose-500/20 active:scale-95 transition text-xs font-mono cursor-pointer"
                >
                  <Trash className="h-4 w-4" />
                  Uninstall Package
                </button>
              </>
            ) : (
              /* Package is NOT installed */
              <button
                onClick={() => onInstall(metadata || { Name: pkgName, Version: metadata?.Version || "1.0.0-1", Description: metadata?.Description, isAur })}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-cyan-400 font-extrabold text-[#0b0e14] pb-2.5 pt-2.5 hover:bg-cyan-300 shadow-xl shadow-cyan-400/10 active:scale-95 transition text-xs font-mono cursor-pointer"
              >
                <Download className="h-4 w-4" />
                Build & Install Package
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
