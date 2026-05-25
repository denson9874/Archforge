import { useState, useMemo } from "react";
import { motion } from "motion/react";
import { Package, Search, Check, Info, SlidersHorizontal, ArrowRight, X, AlertCircle } from "lucide-react";
import { InstalledPackage } from "../types";

interface UpgradeConfigModalProps {
  outdatedPackages: InstalledPackage[];
  onConfirm: (selectedNames: string[]) => void;
  onCancel: () => void;
}

export default function UpgradeConfigModal({
  outdatedPackages,
  onConfirm,
  onCancel
}: UpgradeConfigModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNames, setSelectedNames] = useState<string[]>(() =>
    outdatedPackages.map((p) => p.name)
  );

  // Group packages by repository type for informative summaries
  const stats = useMemo(() => {
    const total = outdatedPackages.length;
    const selected = selectedNames.length;
    const aurCount = outdatedPackages.filter((p) => p.repo === "aur").length;
    const officialCount = total - aurCount;

    const selectedAur = outdatedPackages.filter(
      (p) => p.repo === "aur" && selectedNames.includes(p.name)
    ).length;
    const selectedOfficial = selected - selectedAur;

    return {
      total,
      selected,
      aurCount,
      officialCount,
      selectedAur,
      selectedOfficial
    };
  }, [outdatedPackages, selectedNames]);

  // Filter packages based on the search query
  const filteredPackages = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return outdatedPackages;
    return outdatedPackages.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.repo.toLowerCase().includes(query)
    );
  }, [outdatedPackages, searchQuery]);

  const handleToggle = (name: string) => {
    setSelectedNames((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const handleSelectAll = () => {
    setSelectedNames(outdatedPackages.map((p) => p.name));
  };

  const handleSelectNone = () => {
    setSelectedNames([]);
  };

  const handleConfirmSubmit = () => {
    onConfirm(selectedNames);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none animate-fadeIn">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
        {/* Decorative corner ambient glow */}
        <div className="absolute right-0 top-0 -z-10 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl"></div>
        <div className="absolute left-0 bottom-0 -z-10 h-48 w-48 rounded-full bg-indigo-500/5 blur-3xl"></div>

        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-cyan-500/10 border border-cyan-500/20 p-2 text-cyan-400">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-mono uppercase tracking-wide">
                Configure Pending Upgrades
              </h2>
              <p className="text-xs text-zinc-400 font-sans mt-0.5">
                Exclude or prioritize packages for our next batch installation build cycle.
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Quick Search & Bulk Selection Actions */}
        <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
          {/* Elegant Search bar input */}
          <div className="relative flex-grow max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search upgrade targets..."
              className="w-full bg-black/40 border border-white/5 hover:border-white/10 focus:border-cyan-400 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition font-mono"
            />
          </div>

          {/* Mass Selection Actions */}
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleSelectAll}
              className="px-3 py-1.5 rounded-lg border border-white/5 bg-white/3 hover:bg-white/5 text-[11px] font-semibold text-slate-300 hover:text-white transition cursor-pointer font-mono"
            >
              Select All
            </button>
            <button
              onClick={handleSelectNone}
              className="px-3 py-1.5 rounded-lg border border-white/5 bg-white/3 hover:bg-white/5 text-[11px] font-semibold text-zinc-400 hover:text-white transition cursor-pointer font-mono"
            >
              Deselect All
            </button>
          </div>
        </div>

        {/* Scrollable package upgrade targets selection area */}
        <div className="mt-4 border border-white/5 rounded-xl bg-black/20 overflow-hidden">
          <div className="max-h-72 overflow-y-auto divide-y divide-white/5 glass-scrollbar">
            {filteredPackages.length > 0 ? (
              filteredPackages.map((pkg) => {
                const isSelected = selectedNames.includes(pkg.name);
                return (
                  <div
                    key={pkg.name}
                    onClick={() => handleToggle(pkg.name)}
                    className={`flex items-center gap-3 p-3.5 hover:bg-white/3 transition cursor-pointer ${
                      isSelected ? "bg-cyan-500/2" : ""
                    }`}
                  >
                    {/* Custom HTML/CSS Checkbox Indicator */}
                    <div
                      className={`h-4.5 w-4.5 rounded-md flex items-center justify-center transition border ${
                        isSelected
                          ? "bg-cyan-500 border-cyan-400 text-zinc-950"
                          : "border-white/15 hover:border-white/20 bg-black/40 text-transparent"
                      }`}
                    >
                      <Check className="h-3 w-3 stroke-[3]" />
                    </div>

                    {/* Metadata package identifiers */}
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[13px] text-white font-mono truncate">
                          {pkg.name}
                        </span>
                        <span
                          className={`text-[9px] font-bold font-mono px-1.5 py-0.25 rounded uppercase border ${
                            pkg.repo === "aur"
                              ? "bg-cyan-950/40 text-cyan-400 border-cyan-800/30"
                              : "bg-emerald-950/40 text-emerald-400 border-emerald-800/30"
                          }`}
                        >
                          {pkg.repo}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 truncate mt-0.5 pr-2">
                        {pkg.description || "No description provided for package recipe."}
                      </p>
                    </div>

                    {/* Build Versions Shift info */}
                    <div className="flex flex-col items-end shrink-0 text-right">
                      <div className="flex items-center gap-1.5 text-xs text-zinc-300 font-mono">
                        <span className="text-zinc-500 line-through select-all">{pkg.version}</span>
                        <ArrowRight className="h-3 w-3 text-cyan-400 shrink-0" />
                        <span className="text-cyan-400 font-bold select-all">{pkg.newVersion || "latest"}</span>
                      </div>
                      {pkg.size && (
                        <span className="text-[10px] text-zinc-500 font-mono mt-0.5">
                          {pkg.size}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-zinc-500 font-sans text-xs">
                {searchQuery ? "No pending upgrades match your filter query." : "No pending upgrades found."}
              </div>
            )}
          </div>
        </div>

        {/* Selected Summary and Alerts */}
        <div className="mt-4 flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center justify-between text-xs font-mono text-zinc-400 bg-white/2 border border-white/5 rounded-xl p-3">
            <div>
              Upgrades Selected: <span className="text-white font-bold">{stats.selected}</span> of{" "}
              <span className="text-slate-400">{stats.total}</span>
            </div>
            <div className="flex gap-3 text-[11px]">
              <span className="text-white/60">
                Official: <strong className="text-emerald-400">{stats.selectedOfficial}</strong>
              </span>
              <span className="text-white/60">
                AUR (makepkg): <strong className="text-cyan-400">{stats.selectedAur}</strong>
              </span>
            </div>
          </div>

          {stats.selected === 0 && (
            <div className="flex items-center gap-2 text-[11px] text-amber-400 bg-amber-500/5 border border-amber-500/10 rounded-xl px-3 py-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>You must select at least 1 package to proceed with the build upgrade process.</span>
            </div>
          )}
        </div>

        {/* Confirmation Buttons and Actions Footer */}
        <div className="mt-5 border-t border-white/5 pt-4 flex justify-end gap-3 font-sans">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={stats.selected === 0}
            onClick={handleConfirmSubmit}
            className="rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-500 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-500 text-zinc-950 font-bold px-5 py-2 hover:opacity-90 transition cursor-pointer disabled:cursor-not-allowed font-mono text-xs uppercase tracking-wide"
          >
            Begin Batch Upgrades ({stats.selected})
          </button>
        </div>
      </div>
    </div>
  );
}
