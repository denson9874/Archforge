import { useState, useEffect } from "react";
import { Search, Loader2, Sparkles, SlidersHorizontal, Vote, ArrowRight, CheckCircle2, AlertTriangle, Calendar, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { AurSearchResult, InstalledPackage } from "../types";

interface PackageExplorerProps {
  onSelectPackage: (name: string, isAur: boolean) => void;
  installedPackages: InstalledPackage[];
}

export default function PackageExplorer({ onSelectPackage, installedPackages }: PackageExplorerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "aur" | "official" | "upgrades">("all");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  
  // Sorting and Abandoned filtering state
  const [sortKey, setSortKey] = useState<"popularity" | "votes" | "latest_update" | "name">("popularity");
  const [filterAbandoned, setFilterAbandoned] = useState<"all" | "active" | "abandoned">("all");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Reset page when inputs change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedQuery, activeTab, sortKey, filterAbandoned]);
  
  // Local Database Indexer status state
  const [indexStatus, setIndexStatus] = useState({
    indexedCount: 0,
    isIndexing: false,
    lastIndexTime: 0,
    abandonedCount: 0
  });

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(handler);
  }, [query]);

  // Query indexer status on mount and poll details periodically
  const fetchIndexStatus = async () => {
    try {
      const res = await fetch("/api/aur/index/status");
      if (res.ok) {
        const data = await res.json();
        setIndexStatus(data);
      }
    } catch (e) {
      console.error("Index status sync error:", e);
    }
  };

  useEffect(() => {
    fetchIndexStatus();
    const interval = setInterval(fetchIndexStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  // Trigger manual background AUR chunk sync
  const handleSyncDatabase = async () => {
    try {
      const res = await fetch("/api/aur/index/sync", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setIndexStatus(prev => ({ ...prev, isIndexing: true }));
        // Instantly trigger re-fetch
        fetchResults();
      }
    } catch (e) {
      console.error("Indexer sync request failure:", e);
    }
  };

  // Load defaults or search on query update
  const fetchResults = async () => {
    setLoading(true);
    try {
      const url = debouncedQuery.length >= 2
        ? `/api/aur/search?q=${encodeURIComponent(debouncedQuery)}`
        : `/api/aur/search`; // Empty query returns entire indexed database cached on server!
      
      const res = await fetch(url);
      const data = await res.json();
      setResults(data.results || []);
    } catch (err) {
      console.error("Failed fetching explorer matched rows:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [debouncedQuery, indexStatus.indexedCount]);

  // Filters results locally according to active tabs
  const filteredResults = results.filter(pkg => {
    const isLocal = installedPackages.some(ip => ip.name.toLowerCase() === pkg.Name?.toLowerCase() || ip.name.toLowerCase() === pkg.name?.toLowerCase());
    const localPkg = installedPackages.find(ip => ip.name.toLowerCase() === pkg.Name?.toLowerCase() || ip.name.toLowerCase() === pkg.name?.toLowerCase());

    const isInstalledAur = localPkg?.repo === "aur";
    const isAurPkg = pkg.isAur || isInstalledAur || !pkg.Repo;

    if (activeTab === "aur") {
      return isAurPkg;
    }
    if (activeTab === "official") {
      return !isAurPkg;
    }
    if (activeTab === "upgrades") {
      return isLocal && localPkg?.hasUpdate;
    }
    return true;
  });

  // Sort matched rows and filter by Abandoned state
  const processedResults = filteredResults
    .filter(pkg => {
      const lastMod = pkg.LastModified || pkg.lastModified;
      const isAbandoned = lastMod ? (Date.now() / 1000 - lastMod) > 180 * 24 * 3600 : false;
      
      if (filterAbandoned === "active") {
        return !isAbandoned;
      }
      if (filterAbandoned === "abandoned") {
        return isAbandoned;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortKey === "popularity") {
        return (b.Popularity || 0) - (a.Popularity || 0);
      }
      if (sortKey === "votes") {
        return (b.NumVotes || 0) - (a.NumVotes || 0);
      }
      if (sortKey === "latest_update") {
        const timeA = a.LastModified || a.lastModified || 0;
        const timeB = b.LastModified || b.lastModified || 0;
        return timeB - timeA;
      }
      if (sortKey === "name") {
        const nameA = (a.Name || a.name || "").toLowerCase();
        const nameB = (b.Name || b.name || "").toLowerCase();
        return nameA.localeCompare(nameB);
      }
      return 0;
    });

  return (
    <div className="flex h-full flex-col rounded-xl p-5 glass-panel">
      {/* Search Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Search className="h-5 w-5 text-cyan-400" />
            AUR & Repository Package Explorer
          </h2>
          <p className="text-xs text-slate-450">Discover, filter, and compile packages directly from live index records.</p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type package name (e.g. spotify, chrome)..."
            className="w-full rounded-lg text-sm text-white placeholder-zinc-500 outline-none pb-2 pt-2 pl-9 pr-4 glass-input"
            id="explorer-search-input"
          />
          <div className="absolute left-3 top-2.5 text-zinc-500">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </div>
        </div>
      </div>

      {/* Database Indexer Status Banner */}
      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`h-2.5 w-2.5 rounded-full ${indexStatus.isIndexing ? 'bg-cyan-400 animate-pulse' : 'bg-emerald-500'}`} />
            {indexStatus.isIndexing && (
              <span className="absolute top-0 left-0 h-2.5 w-2.5 rounded-full bg-cyan-400 animate-ping" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-200">AUR Local DB Indexer</span>
              <span className="text-[10px] bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.2 rounded text-cyan-400 font-semibold font-mono">
                {indexStatus.indexedCount} Packages Loaded
              </span>
              {indexStatus.abandonedCount > 0 && (
                <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded text-amber-400 font-semibold font-mono flex items-center gap-1">
                  <AlertTriangle className="h-2.5 w-2.5" />
                  {indexStatus.abandonedCount} Abandoned
                </span>
              )}
            </div>
            <p className="text-[10px] text-zinc-400 mt-0.5 animate-pulse-slow">
              {indexStatus.isIndexing 
                ? "Connecting directly to AUR repositories. Fetching and indexing packages in background..." 
                : indexStatus.lastIndexTime 
                  ? `Database learning index active. Last incremental sync: ${new Date(indexStatus.lastIndexTime).toLocaleTimeString()}`
                  : "Database sync is fully current and standby"
              }
            </p>
          </div>
        </div>
        
        <button
          disabled={indexStatus.isIndexing}
          onClick={handleSyncDatabase}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 disabled:hover:bg-cyan-500/10 disabled:opacity-50 text-xs font-bold text-cyan-400 px-3.5 py-1.5 transition active:scale-95 shrink-0"
        >
          {indexStatus.isIndexing ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              Update Index
            </>
          )}
        </button>
      </div>

      {/* Sorting, Filtering drop-downs, and counts */}
      <div className="mt-4 flex flex-col gap-3 border-t border-white/5 pt-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Repository Tabs */}
        <div className="flex flex-wrap gap-1.5 glass-pill-container p-1 rounded-xl shrink-0 self-start">
          {(["all", "aur", "official", "upgrades"] as const).map((tab) => {
            const labelMap = {
              all: "All Packages",
              aur: "AUR Source",
              official: "Repo Binaries",
              upgrades: "Upgradable Only"
            };
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-xs rounded-md font-semibold transition cursor-pointer ${
                  activeTab === tab
                    ? "bg-white/10 text-cyan-400 border border-white/10"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {labelMap[tab]}
              </button>
            );
          })}
        </div>

        {/* Sorting controls and Filters selector */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-zinc-400 font-mono">Sort By</span>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as any)}
              className="rounded-lg border border-white/5 bg-zinc-900/50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 outline-none hover:border-slate-550 transition font-mono cursor-pointer"
            >
              <option value="popularity">Popularity Rating</option>
              <option value="votes">Num Votes</option>
              <option value="latest_update">Latest Update</option>
              <option value="name">Package Name</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-zinc-400 font-mono">Status</span>
            <select
              value={filterAbandoned}
              onChange={(e) => setFilterAbandoned(e.target.value as any)}
              className="rounded-lg border border-white/5 bg-zinc-900/50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 outline-none hover:border-slate-550 transition font-mono cursor-pointer"
            >
              <option value="all">All Packages</option>
              <option value="active">Active (Recent)</option>
              <option value="abandoned">Abandoned (&gt;6m old)</option>
            </select>
          </div>
          
          <span className="text-xs text-slate-450 font-mono lg:ml-2">
            Found: {processedResults.length} matches
          </span>
        </div>
      </div>

      {/* Grid Results List */}
      {(() => {
        const totalItems = processedResults.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedResults = processedResults.slice(startIndex, endIndex);

        const getPageNumbers = () => {
          const pages: (number | string)[] = [];
          if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) {
              pages.push(i);
            }
          } else {
            pages.push(1);
            
            let start = Math.max(2, currentPage - 1);
            let end = Math.min(totalPages - 1, currentPage + 1);
            
            if (currentPage <= 3) {
              end = 4;
            } else if (currentPage >= totalPages - 2) {
              start = totalPages - 3;
            }
            
            if (start > 2) {
              pages.push("...");
            }
            
            for (let i = start; i <= end; i++) {
              pages.push(i);
            }
            
            if (end < totalPages - 1) {
              pages.push("...");
            }
            
            pages.push(totalPages);
          }
          return pages;
        };

        return (
          <>
            <div className="mt-4 flex-1 overflow-y-auto min-h-[500px] max-h-[850px] pr-1 space-y-3 glass-scrollbar">
              {paginatedResults.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 animate-fadeIn">
                  {paginatedResults.map((pkg, idx) => {
                    const name = pkg.Name || pkg.name;
                    const version = pkg.Version || pkg.version;
                    const description = pkg.Description || pkg.description;
                    const isLocal = installedPackages.find(ip => ip.name.toLowerCase() === name.toLowerCase());
                    const isAurPkg = pkg.isAur || isLocal?.repo === "aur" || !pkg.Repo;
                    
                    // Calculate if abandoned (greater than 6 months/180 days since last update)
                    const lastMod = pkg.LastModified || pkg.lastModified;
                    const isAbandoned = lastMod ? (Date.now() / 1000 - lastMod) > 180 * 24 * 3600 : false;
                    
                    const formattedDate = lastMod ? new Date(lastMod * 1000).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    }) : null;

                    return (
                      <div
                        key={idx}
                        onClick={() => onSelectPackage(name, isAurPkg)}
                        className={`group relative flex flex-col justify-between rounded-xl p-4 transition duration-200 w-full glass-panel glass-panel-hover cursor-pointer border ${
                          isAbandoned 
                            ? "border-amber-500/10 hover:border-amber-500/25 bg-amber-500/[0.01]" 
                            : "border-white/5"
                        }`}
                      >
                        <div>
                          {/* Upper Badge Line */}
                          <div className="flex items-start justify-between">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-sm font-bold text-white group-hover:text-cyan-400 transition font-mono flex items-center gap-1.5">
                                {name}
                                {isAbandoned && (
                                  <span className="rounded bg-amber-500/10 border border-amber-500/20 px-1 py-0.2 text-[8px] font-black uppercase text-amber-400 font-mono flex items-center gap-0.5">
                                    Abandoned
                                  </span>
                                )}
                              </span>
                              <span className="text-[10px] text-zinc-400 font-mono">
                                Version: {version}
                              </span>
                            </div>

                            <div className="flex gap-1.5 items-center shrink-0">
                              {isLocal && (
                                <span className="flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-400 font-mono">
                                  <CheckCircle2 className="h-2.5 w-2.5" />
                                  Installed
                                </span>
                              )}
                              <span
                                className={`rounded px-1.5 py-0.5 text-[9px] font-bold font-mono ${
                                  isAurPkg
                                    ? "bg-cyan-950/60 border border-cyan-800/30 text-cyan-300"
                                    : "bg-blue-950/60 border border-blue-800/30 text-blue-300"
                                }`}
                              >
                                {isAurPkg ? "AUR" : pkg.Repo?.toUpperCase() || "CORE"}
                              </span>
                            </div>
                          </div>

                          <p className="mt-2 text-xs text-slate-400 line-clamp-2">
                            {description || "No description loaded for this build script."}
                          </p>
                        </div>

                        {/* Foot Line */}
                        <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
                          {isAurPkg ? (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-zinc-400 font-mono">
                              <span className="flex items-center gap-1">
                                <Vote className="h-3 w-3 text-cyan-500/70" />
                                Votes: {pkg.NumVotes || 0}
                              </span>
                              <span>Pop: {(pkg.Popularity || 0).toFixed(1)}%</span>
                              {formattedDate && (
                                <span className="flex items-center gap-1 text-slate-400">
                                  <Clock className="h-3 w-3 text-cyan-500/60" />
                                  Updated: {formattedDate}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-zinc-400 font-mono">
                              Official Arch Mirror Binaries
                            </span>
                          )}

                          <span className="flex items-center gap-1 text-[10px] font-semibold text-cyan-400 opacity-0 group-hover:opacity-100 transition duration-150 shrink-0 self-end">
                            Build Details
                            <ArrowRight className="h-3 w-3" />
                          </span>
                        </div>

                        {/* Highlights Strip top banner border */}
                        {isLocal?.hasUpdate && (
                          <div className="absolute top-0 left-4 h-0.5 w-16 bg-gradient-to-r from-emerald-500 to-cyan-500 shadow-xl"></div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-xl p-12 text-center glass-panel">
                  <SlidersHorizontal className="mb-3 h-10 w-10 text-zinc-500" />
                  <h4 className="text-sm font-semibold text-slate-200">No matching repositories found</h4>
                  <p className="max-w-xs text-xs text-zinc-500 mt-1">
                    Verify your package name spelling, index sorting selectors, or trigger "Update Index" to retrieve the latest definitions.
                  </p>
                </div>
              )}
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="mt-5 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-4 sm:flex-row font-mono text-xs">
                <span className="text-zinc-500">
                  Showing <span className="text-cyan-400 font-semibold">{startIndex + 1}</span> to{" "}
                  <span className="text-cyan-400 font-semibold">{Math.min(endIndex, totalItems)}</span> of{" "}
                  <span className="text-zinc-350">{totalItems}</span> packages
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/5 bg-zinc-900/40 text-slate-400 transition hover:bg-white/5 hover:text-white disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
                    title="Previous Page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  
                  {getPageNumbers().map((page, idx) => {
                    if (page === "...") {
                      return (
                        <span key={`dots-${idx}`} className="px-1.5 text-zinc-650">
                          ...
                        </span>
                      );
                    }
                    return (
                      <button
                        key={`page-${page}`}
                        onClick={() => setCurrentPage(Number(page))}
                        className={`flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-xs font-bold transition duration-150 cursor-pointer ${
                          currentPage === page
                            ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.1)]"
                            : "border-white/5 bg-zinc-900/20 text-slate-400 hover:border-white/10 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/5 bg-zinc-900/40 text-slate-400 transition hover:bg-white/5 hover:text-white disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
                    title="Next Page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}
