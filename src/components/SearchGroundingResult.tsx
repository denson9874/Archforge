import React, { useState, useEffect } from "react";
import { Loader2, Globe, ExternalLink, ShieldAlert } from "lucide-react";
import Markdown from "react-markdown";

interface SearchGroundingResultProps {
  query: string;
}

export default function SearchGroundingResult({ query }: SearchGroundingResultProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const handleGroundingSearch = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/aur/search/grounded", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (!res.ok) {
        throw new Error("Failed to fetch from server");
      }
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setResult(data);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only auto-trigger when query is not essentially empty.
    if (query.trim().length >= 2) {
      handleGroundingSearch();
    } else {
      setResult(null);
    }
  }, [query]);

  return (
    <div className="flex flex-col items-start justify-start w-full gap-4 mt-6 animate-fadeIn text-left">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-indigo-400" />
        <h4 className="text-sm font-semibold text-slate-200">
          Search Grounding: Official Arch Linux Updates
        </h4>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-zinc-400 text-sm">
          <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
          Querying Gemini for latest Arch advisories & news...
        </div>
      )}

      {error && (
        <div className="text-red-400 text-sm">Error: {error}</div>
      )}

      {result && !loading && (
        <div className="bg-zinc-900/60 p-5 rounded-xl border border-white/10 w-full overflow-hidden">
          <div className="prose prose-invert prose-sm max-w-none mb-4 markdown-body">
            <Markdown>{result.text}</Markdown>
          </div>
          
          {result.sources && result.sources.length > 0 && (
            <div className="border-t border-white/10 pt-3 mt-4">
              <h5 className="text-[10px] uppercase font-bold text-zinc-500 mb-2">Sources</h5>
              <div className="flex flex-col gap-1">
                {result.sources.map((src: any, idx: number) => (
                  <a
                    key={idx}
                    href={src.uri}
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Globe className="h-3 w-3" />
                    <span>{src.title || src.uri}</span>
                    <ExternalLink className="h-2.5 w-2.5 opacity-50" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
