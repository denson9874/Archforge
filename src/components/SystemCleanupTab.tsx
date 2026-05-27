import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, ShieldCheck, Database, FileX, RefreshCw, AlertTriangle, CheckCircle2, Clock, PieChart } from "lucide-react";
import SystemCleanupChart from "./SystemCleanupChart";

interface ScanResults {
  orphans: string[];
  orphansSize: string;
  systemCacheSize: string;
  aurCacheSize: string;
  aurCacheFiles?: string[];
}

export default function SystemCleanupTab() {
  const [isScanning, setIsScanning] = useState(true);
  const [results, setResults] = useState<ScanResults | null>(null);
  
  const [options, setOptions] = useState({
    removeOrphans: true,
    clearSystemCache: false,
    clearAurCache: true
  });

  const [selectedOrphans, setSelectedOrphans] = useState<string[]>([]);
  const [selectedAurCaches, setSelectedAurCaches] = useState<string[]>([]);

  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanLogs, setCleanLogs] = useState<string[]>([]);
  const [cleanComplete, setCleanComplete] = useState(false);
  
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [totalSpaceToFree, setTotalSpaceToFree] = useState("0 B");
  const [showToast, setShowToast] = useState(false);

  // Auto-Cleanup Schedule states
  const [autoCleanEnabled, setAutoCleanEnabled] = useState(() => localStorage.getItem("archforge_autoclean") === "true");
  const [autoCleanThreshold, setAutoCleanThreshold] = useState(() => localStorage.getItem("archforge_autoclean_threshold") || "2");

  useEffect(() => {
    localStorage.setItem("archforge_autoclean", autoCleanEnabled.toString());
  }, [autoCleanEnabled]);

  useEffect(() => {
    localStorage.setItem("archforge_autoclean_threshold", autoCleanThreshold);
  }, [autoCleanThreshold]);

  useEffect(() => {
    fetchScan();
  }, []);

  const fetchScan = async (background = false) => {
    setIsScanning(true);
    if (!background) {
      setResults(null);
      setCleanComplete(false);
      setCleanLogs([]);
    }
    try {
      const res = await fetch("/api/system/cleanup/scan");
      if (!res.ok) {
        throw new Error(`Failed to load: ${res.statusText}`);
      }
      const data = await res.json();
      setResults(data);
      setSelectedOrphans(data.orphans || []);
      setSelectedAurCaches(data.aurCacheFiles || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsScanning(false);
    }
  };

  const parseSizeToMB = (sizeStr: string): number => {
    if (!sizeStr) return 0;
    const match = sizeStr.match(/([\d.]+)\s*([A-Za-z]+)/);
    if (!match) return 0;
    const val = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    if (unit === 'B') return val / (1024 * 1024);
    if (unit === 'KB' || unit === 'K') return val / 1024;
    if (unit === 'MB' || unit === 'M') return val;
    if (unit === 'GB' || unit === 'G') return val * 1024;
    if (unit === 'TB' || unit === 'T') return val * 1024 * 1024;
    return val;
  };

  const formatMB = (mb: number): string => {
    if (mb < 1) return (mb * 1024).toFixed(1) + " KB";
    if (mb < 1024) return mb.toFixed(1) + " MB";
    return (mb / 1024).toFixed(2) + " GB";
  };

  const handleCleanupClick = () => {
    let totalMB = 0;
    if (options.removeOrphans && results?.orphansSize) totalMB += parseSizeToMB(results.orphansSize);
    if (options.clearSystemCache && results?.systemCacheSize) totalMB += parseSizeToMB(results.systemCacheSize);
    if (options.clearAurCache && results?.aurCacheSize) totalMB += parseSizeToMB(results.aurCacheSize);
    
    setTotalSpaceToFree(formatMB(totalMB));
    setShowConfirmModal(true);
  };

  const handleCleanup = async () => {
    setIsCleaning(true);
    setCleanLogs([]);
    setCleanComplete(false);
    
    try {
      const res = await fetch("/api/system/cleanup/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...options, selectedOrphans, selectedAurCaches })
      });
      if (!res.ok) {
        throw new Error(`Execution failed: ${res.statusText}`);
      }
      const data = await res.json();
      if (data.success) {
        setCleanLogs(data.logs || []);
        setCleanComplete(true);
        setShowToast(true);
        setShowConfirmModal(false);
        setTimeout(() => setShowToast(false), 4000);
        // Rescan after a short delay
        setTimeout(() => fetchScan(true), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-indigo-400" />
          System Cleanup
        </h2>
        <button
          onClick={() => fetchScan(false)}
          disabled={isScanning || isCleaning}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition outline-none disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isScanning ? "animate-spin" : ""}`} />
          Refresh Scan
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column: Data Grid */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Orphans Card */}
          <div className="glass-panel p-5 rounded-xl border border-white/10 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-500/10 rounded-lg">
                    <FileX className="h-5 w-5 text-rose-400" />
                  </div>
                  <h3 className="font-semibold text-slate-200">Orphaned Packages</h3>
                </div>
                {results?.orphansSize && !isScanning && (
                   <span className="text-xs font-mono text-rose-300 bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-500/20">{results.orphansSize}</span>
                )}
              </div>
              <p className="text-xs text-slate-400">Dependencies that were installed for other software and are no longer required.</p>
              
              <div className="mt-4 tabular-nums">
                {isScanning ? (
                    <span className="text-sm text-slate-500 flex items-center gap-1"><RefreshCw className="h-3 w-3 animate-spin"/> Scanning...</span>
                ) : (
                  <div className="text-2xl font-bold text-white">
                    {results?.orphans?.length || 0}
                    <span className="text-xs font-normal text-slate-500 ml-2">packages found</span>
                  </div>
                )}
              </div>

              {results?.orphans && results.orphans.length > 0 && !isScanning && (
                <div className="mt-4 text-xs font-mono">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-slate-500 font-medium">Orphan packages:</p>
                    <button 
                      onClick={() => {
                        if (selectedOrphans.length === results.orphans.length) {
                          setSelectedOrphans([]);
                        } else {
                          setSelectedOrphans([...results.orphans]);
                        }
                      }}
                      disabled={!options.removeOrphans || isCleaning}
                      className="text-[10px] text-cyan-500 hover:text-cyan-400 font-semibold px-2 py-0.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {selectedOrphans.length === results.orphans.length ? "Deselect All" : "Select All"}
                    </button>
                  </div>
                  <ul className="space-y-1 max-h-24 overflow-y-auto bg-black/40 scrollbar-thin rounded-lg p-2.5 border border-white/5">
                    {results.orphans.map((pkg, i) => (
                      <li key={i} className="truncate flex items-center gap-2 text-slate-400">
                        <input
                          type="checkbox"
                          checked={selectedOrphans.includes(pkg)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedOrphans([...selectedOrphans, pkg]);
                            else setSelectedOrphans(selectedOrphans.filter(p => p !== pkg));
                          }}
                          disabled={!options.removeOrphans || isCleaning}
                          className="rounded border-slate-600 bg-transparent text-rose-500 cursor-pointer h-3 w-3"
                        />
                        <span className={!selectedOrphans.includes(pkg) ? "opacity-50 line-through" : ""}>{pkg}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            <label className="mt-6 flex items-center gap-2 cursor-pointer group/toggle relative z-10 w-fit">
              <div className={`w-4 h-4 rounded border flex items-center justify-center transition ${options.removeOrphans ? 'bg-rose-500 border-rose-500' : 'border-slate-600 group-hover/toggle:border-slate-400'}`}>
                {options.removeOrphans && <CheckCircle2 className="h-3 w-3 text-white" />}
              </div>
              <span className="text-sm text-slate-300 font-medium">Remove Orphans</span>
              <input 
                type="checkbox" 
                checked={options.removeOrphans} 
                onChange={(e) => setOptions({...options, removeOrphans: e.target.checked})}
                className="hidden" 
                disabled={isCleaning || (results?.orphans?.length === 0)}
              />
            </label>
          </div>

          {/* System Cache Card */}
          <div className="glass-panel p-5 rounded-xl border border-white/10 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-indigo-500/10 rounded-lg">
                  <Database className="h-5 w-5 text-indigo-400" />
                </div>
                <h3 className="font-semibold text-slate-200">Pacman Cache</h3>
              </div>
              <p className="text-xs text-slate-400">Arch Linux keeps downloaded packages in cache (<code>/var/cache/pacman/pkg</code>) to allow downgrades.</p>
              
              <div className="mt-4 tabular-nums">
                {isScanning ? (
                    <span className="text-sm text-slate-500 flex items-center gap-1"><RefreshCw className="h-3 w-3 animate-spin"/> Scanning...</span>
                ) : (
                  <div className="text-2xl font-bold text-white">
                    {results?.systemCacheSize || "0 B"}
                    <span className="text-xs font-normal text-slate-500 ml-2">used</span>
                  </div>
                )}
              </div>
            </div>
            
            <label className="mt-6 flex items-center gap-2 cursor-pointer group/toggle relative z-10">
              <div className={`w-4 h-4 rounded border flex items-center justify-center transition ${options.clearSystemCache ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600 group-hover/toggle:border-slate-400'}`}>
                {options.clearSystemCache && <CheckCircle2 className="h-3 w-3 text-white" />}
              </div>
              <span className="text-sm text-slate-300 font-medium">Clear Pacman Cache</span>
              <input 
                type="checkbox" 
                checked={options.clearSystemCache} 
                onChange={(e) => setOptions({...options, clearSystemCache: e.target.checked})}
                className="hidden" 
                disabled={isCleaning}
              />
            </label>
          </div>

          {/* AUR Cache Card */}
          <div className="glass-panel p-5 rounded-xl border border-cyan-500/20 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-cyan-500/10 rounded-lg">
                  <ShieldCheck className="h-5 w-5 text-cyan-400" />
                </div>
                <h3 className="font-semibold text-slate-200">AUR Build Dirs</h3>
              </div>
              <p className="text-xs text-slate-400">Unused build directories, git clones, and compilation traces left over in <code>~/.cache/yay</code>.</p>
              
              <div className="mt-4 tabular-nums">
                {isScanning ? (
                   <span className="text-sm text-slate-500 flex items-center gap-1"><RefreshCw className="h-3 w-3 animate-spin"/> Scanning...</span>
                ) : (
                  <div className="text-2xl font-bold text-white">
                    {results?.aurCacheSize || "0 B"}
                    <span className="text-xs font-normal text-cyan-500/70 ml-2">used</span>
                  </div>
                )}
              </div>

              {results?.aurCacheFiles && results.aurCacheFiles.length > 0 && !isScanning && (
                <div className="mt-4 text-xs">
                  <p className="text-slate-500 mb-1.5 font-medium flex justify-between items-center">
                    <span>Cached package directories:</span>
                  </p>
                  <ul className="text-slate-400 font-mono space-y-1 max-h-24 overflow-y-auto bg-black/40 scrollbar-thin rounded-lg p-2.5 border border-white/5">
                    {results.aurCacheFiles.map((file, i) => (
                      <li key={i} className="truncate flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedAurCaches.includes(file)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedAurCaches([...selectedAurCaches, file]);
                            else setSelectedAurCaches(selectedAurCaches.filter(f => f !== file));
                          }}
                          disabled={!options.clearAurCache || isCleaning}
                          className="rounded border-slate-600 bg-transparent text-cyan-500 cursor-pointer h-3 w-3"
                        />
                        <span className="text-cyan-500/50">/</span> 
                        <span className={!selectedAurCaches.includes(file) ? "opacity-50 line-through" : ""}>{file}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            <label className="mt-6 flex items-center gap-2 cursor-pointer group/toggle relative z-10 w-fit">
               <div className={`w-4 h-4 rounded border flex items-center justify-center transition ${options.clearAurCache ? 'bg-cyan-500 border-cyan-500' : 'border-slate-600 group-hover/toggle:border-slate-400'}`}>
                {options.clearAurCache && <CheckCircle2 className="h-3 w-3 text-black" />}
              </div>
              <span className="text-sm text-slate-300 font-medium">Clear AUR Cache</span>
              <input 
                type="checkbox" 
                checked={options.clearAurCache} 
                onChange={(e) => setOptions({...options, clearAurCache: e.target.checked})}
                className="hidden" 
                disabled={isCleaning}
              />
            </label>
          </div>
        </div>

        {/* Right Column: Visualization Chart */}
        <div className="lg:col-span-1 glass-panel rounded-xl border border-white/5 p-5 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="flex items-center gap-2 mb-4 self-start w-full opacity-80">
             <PieChart className="h-4 w-4 text-slate-400" />
             <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Disk Distribution</h4>
          </div>
          
          <div className="flex-grow flex items-center justify-center w-full">
            {isScanning ? (
              <div className="text-slate-500 flex flex-col items-center gap-2">
                <RefreshCw className="h-6 w-6 animate-spin text-slate-600" />
                <span className="text-xs font-medium">Analyzing...</span>
              </div>
            ) : results ? (
              <SystemCleanupChart 
                orphansSize={results.orphansSize || "0 B"} 
                systemCacheSize={results.systemCacheSize || "0 B"} 
                aurCacheSize={results.aurCacheSize || "0 B"} 
              />
            ) : (
              <div className="text-slate-500 text-xs">No data available</div>
            )}
          </div>
        </div>

      </div>

      {/* Auto-Cleanup Schedule Rule */}
      <div className="bg-white/[0.02] border border-cyan-500/20 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-cyan-400" />
            <h4 className="font-semibold text-sm text-cyan-100">Recurring Schedule Rule</h4>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-lg">
            Automatically execute a silent background cleanup of the AUR package cache when it exceeds a specified size threshold. Requires the applet to be running.
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto mt-2 md:mt-0">
          <select 
            className="bg-[#0b0e14] border border-white/10 text-slate-300 text-xs rounded-lg px-3 py-2 outline-none focus:border-cyan-500 transition-colors cursor-pointer"
            value={autoCleanThreshold}
            onChange={(e) => setAutoCleanThreshold(e.target.value)}
            disabled={!autoCleanEnabled}
          >
            <option value="1">Threshold: 1 GB</option>
            <option value="2">Threshold: 2 GB</option>
            <option value="5">Threshold: 5 GB</option>
            <option value="10">Threshold: 10 GB</option>
          </select>

          <button 
            onClick={() => setAutoCleanEnabled(!autoCleanEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors outline-none focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-2 focus:ring-offset-black ${
              autoCleanEnabled ? 'bg-cyan-500' : 'bg-slate-700'
            }`}
          >
             <span
               className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                 autoCleanEnabled ? 'translate-x-6' : 'translate-x-1'
               }`}
             />
          </button>
        </div>
      </div>

      <div className="mt-6 bg-black/40 border border-white/5 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h4 className="font-semibold text-sm text-white">Ready to Clean</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-lg">
             Select the system areas you wish to prune. Clearing caches frees up disk space but may require redownloading files if you re-install those same packages.
          </p>
        </div>
        <button
          className="flex-shrink-0 bg-red-500 hover:bg-red-400 text-white font-bold text-sm px-6 py-2.5 rounded-lg shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
          onClick={handleCleanupClick}
          disabled={!results || isScanning || isCleaning || (!options.removeOrphans && !options.clearAurCache && !options.clearSystemCache)}
        >
          {isCleaning ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          {isCleaning ? "Cleaning..." : "Execute Cleanup"}
        </button>
      </div>

      {/* Execution Logs */}
      <AnimatePresence>
        {(cleanLogs.length > 0 || isCleaning) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl bg-[#0b0e14] border border-white/5 overflow-hidden"
          >
            <div className="bg-white/5 px-4 py-2 border-b border-white/5 flex items-center justify-between">
               <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                 <TerminalIcon className="h-3.5 w-3.5"/> Action Logs
               </span>
               {cleanComplete && <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Complete</span>}
            </div>
            <div className="p-4 font-mono text-xs text-slate-300 space-y-1.5 max-h-48 overflow-y-auto">
               {cleanLogs.map((log, i) => (
                 <div key={i} className={log.startsWith("==>") ? "text-cyan-400 font-bold mt-2" : "text-slate-400 ml-4"}>
                   {log}
                 </div>
               ))}
               {isCleaning && (
                 <div className="text-amber-500 animate-pulse mt-2 ml-4 flex items-center gap-2">
                   <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                   Working...
                 </div>
               )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => {
                if (!isCleaning) setShowConfirmModal(false);
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[#0b0e14] border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-6 glass-panel"
            >
              <div className="flex items-center gap-3 text-amber-400 mb-4">
                <AlertTriangle className="h-6 w-6" />
                <h3 className="text-xl font-bold text-white">Confirm Cleanup</h3>
              </div>
              <p className="text-sm text-slate-300 mb-4">
                You are about to execute a system cleanup. This operation will free up approximately <strong className="text-white">{totalSpaceToFree}</strong> of disk space.
              </p>
              <div className="space-y-2 mb-6">
                {options.removeOrphans && (
                  <div className="flex justify-between text-xs p-2 bg-white/5 rounded-lg border border-white/5">
                    <span className="text-slate-400">Remove Orphans</span>
                    <span className="text-rose-400 font-mono">{results?.orphansSize || "0 B"}</span>
                  </div>
                )}
                {options.clearSystemCache && (
                  <div className="flex justify-between text-xs p-2 bg-white/5 rounded-lg border border-white/5">
                    <span className="text-slate-400">Clear Pacman Cache</span>
                    <span className="text-indigo-400 font-mono">{results?.systemCacheSize || "0 B"}</span>
                  </div>
                )}
                {options.clearAurCache && (
                  <div className="flex justify-between text-xs p-2 bg-white/5 rounded-lg border border-white/5">
                    <span className="text-slate-400">Clear AUR Cache</span>
                    <span className="text-cyan-400 font-mono">{results?.aurCacheSize || "0 B"}</span>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-300 bg-white/5 hover:bg-white/10 transition disabled:opacity-50"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={isCleaning}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-red-500 hover:bg-red-400 shadow-lg shadow-red-500/20 transition flex items-center gap-2 disabled:opacity-50"
                  onClick={() => handleCleanup()}
                  disabled={isCleaning}
                >
                  {isCleaning ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  {isCleaning ? "Executing Cleanup..." : "Confirm Execute"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Toast %} */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md"
          >
            <CheckCircle2 className="h-5 w-5" />
            <div>
              <h4 className="font-bold text-sm">Cleanup Successful</h4>
              <p className="text-xs text-emerald-400/80">Selected system areas have been cleared.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TerminalIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" x2="20" y1="19" y2="19" />
    </svg>
  )
}
