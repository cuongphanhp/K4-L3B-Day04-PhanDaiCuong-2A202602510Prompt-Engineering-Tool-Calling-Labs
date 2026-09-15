import React from "react";
import { Shield, GitBranch, Cpu, Sparkles, Hash } from "lucide-react";

export default function Header({ info, version, provider, isConnected }) {
  const artifactVersion = info?.artifact_version || `${version}+untracked`;
  const promptHash = info?.prompt_hash
    ? info.prompt_hash.substring(0, 10) + "..."
    : "pending";
  const toolsHash = info?.tools_hash
    ? info.tools_hash.substring(0, 10) + "..."
    : "pending";
  const modelName = info?.default_model || "gemini-2.5-flash";

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 px-4 md:px-6 flex items-center justify-between z-10 select-none shadow-sm">
      {/* Brand / Logo */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 p-0.5 shadow-md shadow-indigo-500/10">
          <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
            <Shield className="w-5 h-5 text-cyan-400" />
          </div>
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-base font-bold text-slate-100 tracking-tight">
              Northstar IT Helpdesk Copilot
            </h1>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              vinAI K4-L3B
            </span>
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">
            Agentic Tool Calling & Prompt Engineering Lab
          </p>
        </div>
      </div>

      {/* Artifact Version & Model Status Badges */}
      <div className="flex items-center space-x-2.5">
        {/* Version & Hash Badge */}
        <div
          title={`Artifact Version: ${artifactVersion}\nPrompt Hash: ${info?.prompt_hash || "N/A"}\nTools Hash: ${info?.tools_hash || "N/A"}`}
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/80 text-xs text-slate-300 font-mono shadow-inner cursor-help hover:border-slate-600 transition-colors"
        >
          <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-semibold text-indigo-300">
            {version.toUpperCase()}
          </span>
          <span className="text-slate-400">|</span>
          <span className="text-[11px] text-slate-400 truncate max-w-[120px] sm:max-w-[180px]">
            {artifactVersion}
          </span>
        </div>

        {/* Model Badge */}
        <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/80 text-xs text-slate-300">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-medium capitalize text-slate-200">
            {provider}
          </span>
          <span className="text-[11px] text-slate-400">({modelName})</span>
        </div>

        {/* Connection status indicator */}
        <div className="flex items-center space-x-1.5 px-2 py-1 rounded-lg bg-slate-800/50 border border-slate-700/40 text-xs">
          <span
            className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-pulse" : "bg-rose-400"}`}
          />
          <span className="text-[11px] font-medium text-slate-300 hidden md:inline">
            {isConnected ? "API Ready" : "Disconnected"}
          </span>
        </div>
      </div>
    </header>
  );
}
