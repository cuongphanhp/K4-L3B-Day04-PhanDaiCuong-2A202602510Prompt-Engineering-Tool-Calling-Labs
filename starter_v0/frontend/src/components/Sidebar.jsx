import React, { useState } from "react";
import {
  Sliders,
  Sparkles,
  Download,
  RotateCcw,
  Wrench,
  FileJson,
  Check,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  Info,
} from "lucide-react";

export default function Sidebar({
  version,
  setVersion,
  provider,
  setProvider,
  historyWindow,
  setHistoryWindow,
  samplePrompts = [],
  onSelectPrompt,
  onResetChat,
  onExportTranscript,
  tools = [],
  sessionId,
  isOpen,
  setIsOpen,
}) {
  const [showTools, setShowTools] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  return (
    <aside
      className={`w-80 bg-slate-900 border-r border-slate-800 flex flex-col h-full transition-all duration-300 select-none ${
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      } fixed md:static inset-y-0 left-0 z-20 shadow-xl md:shadow-none`}
    >
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Sliders className="w-4 h-4 text-indigo-400" />
          <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
            Cấu hình & Kịch bản
          </h2>
        </div>
        <button
          onClick={onResetChat}
          title="Bắt đầu hội thoại mới"
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs custom-scrollbar">
        {/* Version & Model Config */}
        <div className="space-y-3 p-3 rounded-xl bg-slate-850/80 border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Phiên bản thử nghiệm (Rubric v0–v3)
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {["v0", "v1", "v2", "v3"].map((v) => (
              <button
                key={v}
                onClick={() => setVersion(v)}
                className={`py-1.5 rounded-lg font-mono text-xs font-bold transition-all ${
                  version === v
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 ring-2 ring-indigo-400/50"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-750 hover:text-slate-200"
                }`}
              >
                {v.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="pt-2 space-y-2">
            <label className="block text-slate-400 text-[11px]">
              Provider:
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full bg-slate-900 border border-slate-750 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
            >
              <option value="gemini">Google Gemini (Default)</option>
              <option value="openai">OpenAI (GPT-4o / mini)</option>
              <option value="openrouter">OpenRouter API</option>
              <option value="anthropic">Anthropic Claude</option>
            </select>
          </div>

          <div className="pt-1">
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>Lịch sử gửi kèm (Context Window):</span>
              <span className="font-mono text-indigo-400 font-bold">
                {historyWindow} turns
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={historyWindow}
              onChange={(e) => setHistoryWindow(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>
        </div>

        {/* Quick Demo Rehearsal Scenarios */}
        <div className="space-y-2.5">
          <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Kịch bản Rehearsal / Demo Mẫu</span>
          </div>
          <div className="space-y-1.5">
            {samplePrompts.map((item) => (
              <button
                key={item.id}
                onClick={() => onSelectPrompt(item.prompt)}
                className="w-full text-left p-2.5 rounded-xl bg-slate-850/60 hover:bg-slate-800 border border-slate-800/80 hover:border-slate-700 transition-all group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-slate-200 group-hover:text-indigo-300 transition-colors">
                    {item.title}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-750">
                    {item.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  {item.prompt}
                </p>
                <div className="mt-1.5 text-[10px] font-mono text-indigo-400/80 flex items-center space-x-1">
                  <span>Tool:</span>
                  <span className="underline">{item.expected_tool}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Active Tools List */}
        <div className="space-y-2 pt-1">
          <button
            onClick={() => setShowTools(!showTools)}
            className="w-full flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider py-1 hover:text-slate-300"
          >
            <div className="flex items-center space-x-1.5">
              <Wrench className="w-3.5 h-3.5 text-indigo-400" />
              <span>Danh sách công cụ ({tools.length})</span>
            </div>
            {showTools ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>

          {showTools && (
            <div className="space-y-1.5 pl-1 max-h-52 overflow-y-auto custom-scrollbar">
              {tools.map((t, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/70"
                >
                  <div className="font-mono text-indigo-300 font-semibold text-[11px]">
                    {t.name}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">
                    {t.description}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Footer: Transcript Export & Session Info */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/90 space-y-2">
        <button
          onClick={onExportTranscript}
          className="w-full flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md shadow-indigo-600/20 transition-all"
        >
          <Download className="w-4 h-4" />
          <span>Xuất Transcript (JSON)</span>
        </button>

        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 font-mono">
          <span className="truncate max-w-[170px]" title={sessionId}>
            ID: {sessionId || "Chưa có phiên"}
          </span>
          <span className="text-[10px] text-emerald-400">Live Logged</span>
        </div>
      </div>
    </aside>
  );
}
