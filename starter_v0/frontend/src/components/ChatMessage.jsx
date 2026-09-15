import React from "react";
import { User, Bot, AlertTriangle, Layers } from "lucide-react";
import ToolCallCard from "./ToolCallCard";

export default function ChatMessage({ message }) {
  const isUser = message.role === "user";
  const hasError = Boolean(
    message.error || message.status === "provider_error",
  );
  const toolEvents = message.tool_events || [];
  const rounds = message.rounds || [];

  return (
    <div
      className={`py-4 px-4 md:px-6 flex space-x-3.5 transition-colors ${
        isUser
          ? "bg-slate-900/40"
          : "bg-slate-850/60 border-y border-slate-800/40"
      }`}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 pt-0.5">
        {isUser ? (
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-semibold shadow-inner">
            <User className="w-4 h-4" />
          </div>
        ) : (
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center font-semibold shadow-inner ${
              hasError
                ? "bg-rose-600/20 border border-rose-500/40 text-rose-300"
                : "bg-emerald-600/20 border border-emerald-500/40 text-emerald-300"
            }`}
          >
            <Bot className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Message Body */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center space-x-2">
          <span className="font-medium text-xs text-slate-300">
            {isUser ? "Người dùng (User)" : "Northstar IT Copilot"}
          </span>
          {message.timestamp && (
            <span className="text-[11px] text-slate-400">
              {message.timestamp}
            </span>
          )}
          {rounds.length > 1 && !isUser && (
            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
              <Layers className="w-3 h-3" />
              <span>{rounds.length} rounds</span>
            </span>
          )}
        </div>

        {/* User Content */}
        {isUser && (
          <div className="text-sm text-slate-100 whitespace-pre-wrap leading-relaxed">
            {message.content}
          </div>
        )}

        {/* Assistant Content & Tool Calls */}
        {!isUser && (
          <div className="space-y-3">
            {/* Rounds or Flat Tool Events */}
            {rounds.length > 0 ? (
              <div className="space-y-2">
                {rounds.map((rnd, rIdx) => (
                  <div key={rIdx} className="space-y-1.5">
                    {rnd.tool_results && rnd.tool_results.length > 0
                      ? rnd.tool_results.map((toolEv, tIdx) => (
                          <ToolCallCard
                            key={`${rIdx}-${tIdx}`}
                            toolEvent={toolEv}
                            roundIndex={rounds.length > 1 ? rnd.round : null}
                          />
                        ))
                      : rnd.tool_calls && rnd.tool_calls.length > 0
                        ? rnd.tool_calls.map((call, tIdx) => (
                            <ToolCallCard
                              key={`${rIdx}-${tIdx}`}
                              toolEvent={{ tool: call.name, args: call.args }}
                              roundIndex={rounds.length > 1 ? rnd.round : null}
                            />
                          ))
                        : null}
                  </div>
                ))}
              </div>
            ) : (
              toolEvents.length > 0 && (
                <div className="space-y-2">
                  {toolEvents.map((toolEv, idx) => (
                    <ToolCallCard key={idx} toolEvent={toolEv} />
                  ))}
                </div>
              )
            )}

            {/* Error Banner */}
            {hasError && (
              <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
                <div className="space-y-1">
                  <div className="font-semibold text-rose-200">
                    Phát hiện sự cố gọi Model / Provider:
                  </div>
                  <div className="font-mono text-xs opacity-90 break-all">
                    {message.error}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Lưu ý: Lỗi này được ghi nhận trung thực vào Transcript theo
                    quy định Rubric.
                  </div>
                </div>
              </div>
            )}

            {/* Final Assistant Text Response */}
            {message.content && (
              <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap pt-1 font-sans">
                {message.content}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
