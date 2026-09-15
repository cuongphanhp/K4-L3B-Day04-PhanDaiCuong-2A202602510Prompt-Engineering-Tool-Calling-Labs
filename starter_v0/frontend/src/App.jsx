import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  Sparkles,
  AlertCircle,
  Menu,
  X,
  ArrowDownCircle,
  ShieldCheck,
  Terminal,
  Layers,
} from "lucide-react";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import ChatMessage from "./components/ChatMessage";

const API_BASE = window.location.port === "5173" ? "http://127.0.0.1:8000" : "";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [version, setVersion] = useState("v0");
  const [provider, setProvider] = useState("gemini");
  const [historyWindow, setHistoryWindow] = useState(5);
  const [info, setInfo] = useState(null);
  const [sessionId, setSessionId] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentToolState, setCurrentToolState] = useState(null);

  const chatBottomRef = useRef(null);
  const inputRef = useRef(null);

  // Fetch system & tool info
  const loadInfo = async (ver = version) => {
    try {
      const res = await fetch(`${API_BASE}/api/info?version=${ver}`);
      if (res.ok) {
        const data = await res.json();
        setInfo(data);
        setIsConnected(true);
        if (data.default_provider) {
          setProvider(data.default_provider);
        }
      } else {
        setIsConnected(false);
      }
    } catch (err) {
      console.error("Failed to load system info:", err);
      setIsConnected(false);
    }
  };

  useEffect(() => {
    loadInfo(version);
  }, [version]);

  // Scroll to bottom on new message
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSendMessage = async (textToSend = input) => {
    const text = (textToSend || "").trim();
    if (!text || loading) return;

    setInput("");
    const userMsg = {
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);
    setCurrentToolState("Đang phân tích ý định và chuẩn bị gọi công cụ...");

    try {
      // Build clean history for API
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content || "",
      }));

      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId || undefined,
          user_message: text,
          history: historyPayload,
          version: version,
          provider: provider,
          history_window: historyWindow,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `HTTP Error ${res.status}`);
      }

      const data = await res.json();
      if (data.session_id) {
        setSessionId(data.session_id);
      }

      const assistantMsg = {
        role: "assistant",
        content:
          data.assistant_text ||
          (data.tool_events?.length > 0 ? "" : "Đã xử lý xong."),
        tool_events: data.tool_events || [],
        rounds: data.rounds || [],
        status: data.status,
        error: data.error,
        timestamp: new Date().toLocaleTimeString(),
      };

      setMessages([...newMessages, assistantMsg]);
    } catch (err) {
      console.error("Chat error:", err);
      const errorMsg = {
        role: "assistant",
        content: `Lỗi kết nối hoặc xử lý: ${err.message}`,
        status: "provider_error",
        error: err.message,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages([...newMessages, errorMsg]);
    } finally {
      setLoading(false);
      setCurrentToolState(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleResetChat = () => {
    if (
      messages.length > 0 &&
      !window.confirm("Bạn có chắc muốn làm mới hội thoại?")
    ) {
      return;
    }
    setMessages([]);
    setSessionId("");
    loadInfo(version);
  };

  const handleExportTranscript = () => {
    const transcriptData = {
      exported_at: new Date().toISOString(),
      session_id: sessionId || `web_session_${Date.now()}`,
      version: version,
      provider: provider,
      artifact_version: info?.artifact_version || version,
      prompt_hash: info?.prompt_hash,
      tools_hash: info?.tools_hash,
      turns: messages.map((m, idx) => ({
        index: idx + 1,
        role: m.role,
        content: m.content,
        tool_events: m.tool_events || [],
        rounds: m.rounds || [],
        error: m.error || null,
        timestamp: m.timestamp,
      })),
    };

    const blob = new Blob([JSON.stringify(transcriptData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcript_${version}_${sessionId || Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Sidebar Controls & Rehearsal Scenarios */}
      <Sidebar
        version={version}
        setVersion={setVersion}
        provider={provider}
        setProvider={setProvider}
        historyWindow={historyWindow}
        setHistoryWindow={setHistoryWindow}
        samplePrompts={info?.sample_prompts || []}
        onSelectPrompt={(prompt) => {
          handleSendMessage(prompt);
          if (window.innerWidth < 768) setSidebarOpen(false);
        }}
        onResetChat={handleResetChat}
        onExportTranscript={handleExportTranscript}
        tools={info?.tools || []}
        sessionId={sessionId}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />

      {/* Main App Container */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Top Header */}
        <Header
          info={info}
          version={version}
          provider={provider}
          isConnected={isConnected}
        />

        {/* Mobile Sidebar Toggle Button */}
        <div className="md:hidden flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300"
          >
            {sidebarOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
          <span className="text-xs font-mono text-indigo-400 font-semibold uppercase">
            {version} • {provider}
          </span>
        </div>

        {/* Chat Message Stream */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {messages.length === 0 ? (
            /* Empty State / Welcome Screen */
            <div className="max-w-3xl mx-auto py-12 px-4 md:px-8 text-center space-y-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-indigo-600/30 to-cyan-500/30 border border-indigo-500/40 flex items-center justify-center shadow-lg shadow-indigo-500/10">
                <Sparkles className="w-8 h-8 text-indigo-400" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight text-white">
                  Northstar IT Helpdesk Copilot
                </h2>
                <p className="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
                  Trợ lý IT Agentic với khả năng Tool Calling đa bước, kiểm tra
                  chẩn đoán máy tính, tra cứu dịch vụ, xác nhận hành vi và ghi
                  vết transcript chuẩn Rubric.
                </p>
              </div>

              {/* Bento Feature Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-left pt-4 max-w-2xl mx-auto">
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5 hover:border-slate-700 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                    <Terminal className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-semibold text-slate-200">
                    9 Core IT Tools
                  </div>
                  <div className="text-[11px] text-slate-400 leading-relaxed">
                    Check VPN, tra cứu nhân viên, quét phần cứng, tìm KB, tạo
                    ticket an toàn.
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5 hover:border-slate-700 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-semibold text-slate-200">
                    Safety & Trust Boundary
                  </div>
                  <div className="text-[11px] text-slate-400 leading-relaxed">
                    Ngăn chặn rò rỉ dữ liệu, không đoán mò ID, yêu cầu xác nhận
                    trước khi ghi.
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5 hover:border-slate-700 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-semibold text-slate-200">
                    v0 → v3 Experiment
                  </div>
                  <div className="text-[11px] text-slate-400 leading-relaxed">
                    Theo dõi vết tool calls, arguments và kết quả để chứng minh
                    cải thiện qua từng version.
                  </div>
                </div>
              </div>

              {/* Quick Prompts Suggestions */}
              <div className="pt-6 space-y-2.5">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Bắt đầu nhanh với các câu hỏi mẫu:
                </div>
                <div className="flex flex-wrap justify-center gap-2 max-w-xl mx-auto">
                  {(info?.sample_prompts || []).slice(0, 4).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleSendMessage(p.prompt)}
                      className="px-3 py-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 border border-slate-750 hover:border-indigo-500/50 text-xs text-slate-300 hover:text-white transition-all text-left"
                    >
                      {p.prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Active Messages List */
            <div className="divide-y divide-slate-800/30">
              {messages.map((msg, index) => (
                <ChatMessage key={index} message={msg} />
              ))}
            </div>
          )}

          {/* Loading / Tool Execution Pulse */}
          {loading && (
            <div className="py-4 px-4 md:px-6 bg-slate-850/40 border-y border-slate-800/40 flex items-center space-x-3.5 animate-pulse">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <Terminal className="w-4 h-4 animate-spin" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-indigo-300 flex items-center space-x-2">
                  <span>{currentToolState || "Agent đang xử lý..."}</span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Executing model & tool call pipeline...
                </div>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Bottom Chat Input Bar */}
        <div className="p-3 md:p-4 bg-slate-900 border-t border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="max-w-4xl mx-auto flex items-center space-x-2 bg-slate-950 border border-slate-800 focus-within:border-indigo-500/80 rounded-2xl p-1.5 md:p-2 shadow-lg transition-all"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập yêu cầu hỗ trợ IT (ví dụ: 'Kiểm tra VPN', 'Tra cứu máy LT-204', 'Tìm hướng dẫn Outlook')..."
              disabled={loading}
              className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white disabled:text-slate-500 font-medium transition-colors shadow-md shadow-indigo-600/20 disabled:shadow-none flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="max-w-4xl mx-auto flex items-center justify-between text-[11px] text-slate-400 px-3 pt-2">
            <span>
              Enter để gửi tin nhắn • Tool call events được ghi nhận tự động vào
              transcript
            </span>
            <span className="font-mono text-indigo-400">
              Version: {version}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
