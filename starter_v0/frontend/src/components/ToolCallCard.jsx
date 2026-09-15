import React, { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Wrench,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Terminal,
} from "lucide-react";

export default function ToolCallCard({ toolEvent, roundIndex }) {
  const [isExpanded, setIsExpanded] = useState(true);

  const toolName = toolEvent.tool || toolEvent.name || "unknown_tool";
  const args = toolEvent.args || {};
  const result = toolEvent.result;
  const hasError = Boolean(
    toolEvent.error || (result && typeof result === "object" && result.error),
  );
  const isClarify = toolName === "clarify" || (result && result.awaiting_user);

  return (
    <div
      className={`my-3 rounded-xl border transition-all duration-200 overflow-hidden shadow-sm ${
        hasError
          ? "border-rose-500/40 bg-rose-950/20"
          : isClarify
            ? "border-amber-500/40 bg-amber-950/20"
            : "border-slate-700/60 bg-slate-800/40"
      }`}
    >
      {/* Tool Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between px-3.5 py-2.5 bg-slate-850/60 hover:bg-slate-800/80 cursor-pointer select-none transition-colors border-b border-slate-700/40"
      >
        <div className="flex items-center space-x-2.5 min-w-0">
          <div
            className={`p-1.5 rounded-lg ${
              hasError
                ? "bg-rose-500/20 text-rose-400"
                : isClarify
                  ? "bg-amber-500/20 text-amber-400"
                  : "bg-indigo-500/20 text-indigo-400"
            }`}
          >
            <Wrench className="w-4 h-4" />
          </div>

          <div className="flex items-center space-x-2 truncate">
            <span className="font-mono text-xs font-semibold text-indigo-300 bg-indigo-950/60 border border-indigo-800/60 px-2 py-0.5 rounded-md">
              {toolName}
            </span>
            {roundIndex && (
              <span className="text-[11px] text-slate-400 font-mono">
                [Round {roundIndex}]
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-shrink-0">
          {hasError ? (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30">
              <AlertCircle className="w-3 h-3" />
              <span>Tool Error</span>
            </span>
          ) : isClarify ? (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30">
              <Clock className="w-3 h-3" />
              <span>Cần xác nhận</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-3 h-3" />
              <span>Thành công</span>
            </span>
          )}

          <div className="text-slate-400 hover:text-slate-200">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-3.5 space-y-3 text-xs">
          {/* Arguments */}
          <div>
            <div className="flex items-center space-x-1.5 text-slate-400 font-medium mb-1">
              <Terminal className="w-3.5 h-3.5 text-slate-400" />
              <span>Tham số đầu vào (Arguments):</span>
            </div>
            <pre className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300 font-mono overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
              {JSON.stringify(args, null, 2)}
            </pre>
          </div>

          {/* Result or Error */}
          {hasError ? (
            <div>
              <div className="flex items-center space-x-1.5 text-rose-400 font-medium mb-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Chi tiết lỗi (Tool Failure Evidence):</span>
              </div>
              <pre className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-200 font-mono overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                {JSON.stringify(toolEvent.error || result, null, 2)}
              </pre>
            </div>
          ) : result !== undefined ? (
            <div>
              <div className="flex items-center space-x-1.5 text-emerald-400 font-medium mb-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Kết quả công cụ (Tool Output):</span>
              </div>
              <pre className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-emerald-300/90 font-mono overflow-x-auto max-h-60 overflow-y-auto whitespace-pre-wrap break-all leading-relaxed">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
