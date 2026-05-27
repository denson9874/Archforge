import { motion } from "framer-motion";
import { AlertTriangle, Trash2 } from "lucide-react";

interface UninstallConfirmModalProps {
  pkgName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function UninstallConfirmModal({ pkgName, onConfirm, onCancel }: UninstallConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-red-500/20 bg-slate-900 shadow-2xl p-6"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-500/10">
            <AlertTriangle className="h-6 w-6 text-red-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Confirm Uninstall</h3>
            <p className="mt-2 text-sm text-slate-300">
              Are you sure you want to completely remove <span className="font-mono text-cyan-400">{pkgName}</span> from your system?
            </p>
            <p className="mt-2 text-xs text-slate-400">
              This action may remove configurations and dependent orphan packages might not be cleared automatically.
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            className="rounded-lg bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-red-500/20 transition hover:bg-red-400"
            onClick={onConfirm}
          >
            <Trash2 className="h-4 w-4" />
            Uninstall
          </button>
        </div>
      </motion.div>
    </div>
  );
}
