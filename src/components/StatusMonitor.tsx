import { useEffect, useState } from "react";
import { SystemStats } from "../types";
import { ServerCrash, AlertTriangle, ShieldCheck, Cpu, HardDrive, Database, RefreshCw, Zap } from "lucide-react";

interface StatusMonitorProps {
  stats: SystemStats | null;
  onRefresh: () => void;
  onSyu: () => void;
}

export default function StatusMonitor({ stats, onRefresh, onSyu }: StatusMonitorProps) {
  const [loading, setLoading] = useState(false);

  const handleManualRefresh = () => {
    setLoading(true);
    onRefresh();
    setTimeout(() => setLoading(false), 600);
  };

  if (!stats) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl p-6 text-slate-400 glass-panel">
        <RefreshCw className="mr-2 h-5 w-5 animate-spin text-cyan-400" />
        Loading system statistics...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Repository Stat Widgets */}
      <div className="relative overflow-hidden rounded-xl p-5 glass-panel glass-panel-hover bg-gradient-to-br from-white/5 to-cyan-500/5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-300">System Packages</span>
          <Database className="h-5 w-5 text-cyan-400" />
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold tracking-tight text-white font-mono">{stats.totals.all}</span>
          <span className="text-xs text-slate-400">installed</span>
        </div>
        <div className="mt-2 flex gap-2 text-[10px] text-slate-300">
          <span className="font-mono bg-white/5 px-1.5 py-0.5 rounded border border-white/5">Core: {stats.totals.core}</span>
          <span className="font-mono bg-white/5 px-1.5 py-0.5 rounded border border-white/5">Extra: {stats.totals.extra}</span>
          <span className="font-mono bg-cyan-950/50 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-800/40">AUR: {stats.totals.aur}</span>
        </div>
        <div className="absolute top-0 right-0 h-16 w-16 bg-cyan-500/10 blur-2xl rounded-full"></div>
      </div>

      {/* 2. Health & Integrity Widget */}
      <div className="relative overflow-hidden rounded-xl p-5 glass-panel glass-panel-hover bg-gradient-to-br from-white/5 to-rose-500/5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-300">Package Integrity Health</span>
          <ShieldCheck className="h-5 w-5 text-emerald-400" />
        </div>
        <div className="mt-4 flex items-center justify-between">
          {stats.health.error > 0 ? (
            <div className="flex items-center gap-2">
              <ServerCrash className="h-6 w-6 text-rose-500 animate-pulse" />
              <div>
                <span className="text-sm font-bold text-rose-400 font-mono">{stats.health.error} Critical Error</span>
                <p className="text-[10px] text-zinc-400">Startup library unresolved</p>
              </div>
            </div>
          ) : stats.health.warning > 0 ? (
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
              <div>
                <span className="text-sm font-bold text-amber-400 font-mono">{stats.health.warning} Warning</span>
                <p className="text-[10px] text-zinc-400">Package upgrades available</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-emerald-500" />
              <div>
                <span className="text-sm font-bold text-emerald-400">System Healthy</span>
                <p className="text-[10px] text-zinc-400">100% database integrity</p>
              </div>
            </div>
          )}
        </div>
        <div className="mt-3 flex gap-2 text-[10px] text-slate-400 font-mono">
          <span className="text-emerald-400">● {stats.health.healthy} OK</span>
          {stats.health.warning > 0 && <span className="text-amber-400">▲ {stats.health.warning} Warnings</span>}
          {stats.health.error > 0 && <span className="text-rose-400">■ {stats.health.error} Error</span>}
        </div>
      </div>

      {/* 3. Hardware Resource Utilization */}
      <div className="relative overflow-hidden rounded-xl p-5 glass-panel glass-panel-hover bg-gradient-to-br from-white/5 to-violet-500/5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-300">System Resources</span>
          <Cpu className="h-5 w-5 text-violet-400" />
        </div>
        <div className="mt-4 gap-3 grid grid-cols-2">
          <div>
            <span className="text-[10px] text-zinc-400 uppercase">CPU Usage</span>
            <p className="text-lg font-bold text-white font-mono">{stats.cpuUsage}</p>
          </div>
          <div>
            <span className="text-[10px] text-zinc-400 uppercase">RAM Active</span>
            <p className="text-lg font-extrabold text-white font-mono">{stats.memoryUsage.split("/")[0].trim()}</p>
          </div>
        </div>
        <div className="mt-3.5 h-1 w-full rounded-full bg-white/5 overflow-hidden border border-white/5">
          <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full" style={{ width: "24%" }}></div>
        </div>
      </div>

      {/* 4. Upgrade Stats & Quick Actions */}
      <div className="relative overflow-hidden rounded-xl p-5 glass-panel glass-panel-hover bg-gradient-to-br from-white/5 to-emerald-500/5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-300">System Upgrades</span>
          <HardDrive className="h-5 w-5 text-emerald-400" />
        </div>
        
        <div className="mt-3 flex items-center justify-between">
          <div>
            <span className="text-2xl font-bold text-emerald-400 font-mono">
              {stats.totals.upgrades}
            </span>
            <span className="text-xs text-slate-400 ml-1.5">pending</span>
          </div>

          <button
            onClick={onSyu}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-400 transition hover:bg-emerald-500/20 active:scale-95 cursor-pointer"
          >
            <Zap className="h-3.5 w-3.5" />
            yay -Syu
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>Disk: {stats.diskSpace.used} / {stats.diskSpace.total}</span>
          <span>{stats.diskSpace.percent}%</span>
        </div>
      </div>
    </div>
  );
}
