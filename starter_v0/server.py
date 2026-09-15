from __future__ import annotations

import argparse
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn

from chat import (
    now_iso,
    run_model_tool_loop,
    safe_slug,
    trim_history,
    write_transcript,
)
from env_loader import load_lab_env
from providers import make_provider
from tools import load_tool_declarations, to_openai_tools
from versioning import artifact_version_dict, build_artifact_version

ROOT = Path(__file__).parent
ARTIFACTS_DIR = ROOT / "artifacts"
TRANSCRIPTS_DIR = ROOT / "transcripts"
FRONTEND_DIST = ROOT / "frontend" / "dist"

load_lab_env(ROOT)

app = FastAPI(title="Northstar IT Helpdesk Copilot API", version="1.0.0")

# Enable CORS for Vite dev server (usually localhost:5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session transcript storage
SESSION_TRANSCRIPTS: dict[str, dict[str, Any]] = {}


def get_default_provider() -> str:
    if os.environ.get("GEMINI_API_KEY"):
        return "gemini"
    if os.environ.get("OPENAI_API_KEY"):
        return "openai"
    if os.environ.get("OPENROUTER_API_KEY"):
        return "openrouter"
    if os.environ.get("ANTHROPIC_API_KEY"):
        return "anthropic"
    return "gemini"


SAMPLE_PROMPTS = [
    {
        "id": "vpn_status",
        "title": "Kiểm tra VPN",
        "badge": "Shared Service",
        "prompt": "Dịch vụ VPN production hiện có đang gặp sự cố không?",
        "expected_tool": "check_service_status",
    },
    {
        "id": "device_inspect",
        "title": "Chẩn đoán thiết bị",
        "badge": "Device Diagnostics",
        "prompt": "Kiểm tra tình trạng và chẩn đoán phần cứng máy LT-204.",
        "expected_tool": "inspect_device",
    },
    {
        "id": "kb_outlook",
        "title": "Tìm tài liệu KB",
        "badge": "Knowledge Base",
        "prompt": "Tìm hướng dẫn cấu hình Outlook profile trên Windows 11.",
        "expected_tool": "search_kb",
    },
    {
        "id": "user_lookup",
        "title": "Tra cứu nhân viên",
        "badge": "Directory",
        "prompt": "Tra cứu thông tin và quyền hạn của nhân viên mã EMP-1002.",
        "expected_tool": "lookup_user",
    },
    {
        "id": "create_ticket_confirm",
        "title": "Tạo ticket (Yêu cầu xác nhận)",
        "badge": "Action & Safety",
        "prompt": "Tạo một ticket khẩn cấp báo lỗi hỏng màn hình laptop cho nhân viên EMP-1001.",
        "expected_tool": "create_ticket / clarify",
    },
    {
        "id": "policy_check",
        "title": "Quy định bảo mật IT",
        "badge": "Policy",
        "prompt": "Nhân viên có được tự ý cài đặt phần mềm ngoài danh mục công ty không?",
        "expected_tool": "policy",
    },
]


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    session_id: Optional[str] = None
    user_message: str
    history: List[ChatMessage] = []
    version: str = "v0"
    provider: Optional[str] = None
    model: Optional[str] = None
    history_window: int = 5
    max_tool_rounds: int = 4


@app.get("/api/info")
def get_info(version: str = "v0"):
    sys_prompt_path = ARTIFACTS_DIR / "system_prompt.md"
    tools_path = ARTIFACTS_DIR / "tools.yaml"

    artifact_version = build_artifact_version(version, sys_prompt_path, tools_path)
    tool_declarations = load_tool_declarations(tools_path) if tools_path.exists() else []

    provider_name = get_default_provider()
    try:
        provider_obj = make_provider(provider_name)
        default_model = getattr(provider_obj, "default_model", "default")
    except Exception:
        default_model = "unknown"

    return {
        "version": version,
        "artifact_version": artifact_version.artifact_version,
        "prompt_hash": artifact_version.prompt_hash,
        "tools_hash": artifact_version.tools_hash,
        "default_provider": provider_name,
        "default_model": default_model,
        "available_providers": ["gemini", "openai", "openrouter", "anthropic"],
        "tools": [
            {
                "name": t.get("name"),
                "description": t.get("description"),
                "parameters": t.get("parameters", {}),
            }
            for t in tool_declarations
        ],
        "sample_prompts": SAMPLE_PROMPTS,
    }


@app.post("/api/chat")
def chat_endpoint(req: ChatRequest):
    provider_name = req.provider or get_default_provider()
    sys_prompt_path = ARTIFACTS_DIR / "system_prompt.md"
    tools_path = ARTIFACTS_DIR / "tools.yaml"

    if not sys_prompt_path.exists():
        raise HTTPException(status_code=500, detail="Missing system_prompt.md")
    if not tools_path.exists():
        raise HTTPException(status_code=500, detail="Missing tools.yaml")

    system_prompt = sys_prompt_path.read_text(encoding="utf-8")
    artifact_version = build_artifact_version(req.version, sys_prompt_path, tools_path)
    tool_declarations = load_tool_declarations(tools_path)
    openai_tools = to_openai_tools(tool_declarations)

    try:
        provider_obj = make_provider(provider_name)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to initialize provider {provider_name}: {exc}")

    # Prepare session
    session_id = req.session_id or f"web_{datetime.now().strftime('%Y%m%dT%H%M%S%f')}"
    transcript_filename = f"chat_{session_id}.json"
    transcript_path = TRANSCRIPTS_DIR / transcript_filename

    if session_id not in SESSION_TRANSCRIPTS:
        SESSION_TRANSCRIPTS[session_id] = {
            "session_id": session_id,
            "started_at": now_iso(),
            "version": req.version,
            "provider": provider_name,
            "model": req.model or getattr(provider_obj, "default_model", None),
            **artifact_version_dict(artifact_version),
            "turns": [],
        }

    session_data = SESSION_TRANSCRIPTS[session_id]
    turn_index = len(session_data["turns"]) + 1

    # Format history
    history_dicts = [{"role": msg.role, "content": msg.content} for msg in req.history]
    trimmed_history = trim_history(history_dicts, req.history_window)
    messages = [
        {"role": "system", "content": system_prompt},
        *trimmed_history,
        {"role": "user", "content": req.user_message},
    ]

    turn_record: dict[str, Any] = {
        "turn_index": turn_index,
        "started_at": now_iso(),
        "user": req.user_message,
        "status": "started",
        "assistant_text": None,
        "rounds": [],
        "tool_events": [],
    }

    try:
        result = run_model_tool_loop(
            provider=provider_obj,
            messages=messages,
            tools=openai_tools,
            model=req.model,
            max_tool_rounds=req.max_tool_rounds,
        )
        turn_record.update(result)
    except Exception as exc:
        turn_record.update({
            "status": "provider_error",
            "error": f"{type(exc).__name__}: {str(exc)}",
            "assistant_text": f"Lỗi Provider: {type(exc).__name__}: {str(exc)}",
        })

    turn_record["ended_at"] = now_iso()
    session_data["turns"].append(turn_record)

    # Save transcript file
    try:
        write_transcript(transcript_path, session_data)
    except Exception:
        pass

    return {
        "session_id": session_id,
        "transcript_file": transcript_filename,
        "status": turn_record.get("status"),
        "assistant_text": turn_record.get("assistant_text"),
        "rounds": turn_record.get("rounds", []),
        "tool_events": turn_record.get("tool_events", []),
        "error": turn_record.get("error"),
        "artifact_version": artifact_version_dict(artifact_version),
    }


@app.get("/api/transcripts")
def list_transcripts():
    if not TRANSCRIPTS_DIR.exists():
        return {"transcripts": []}

    files = sorted(TRANSCRIPTS_DIR.glob("*.json"), key=os.path.getmtime, reverse=True)
    return {
        "transcripts": [
            {
                "name": f.name,
                "size_bytes": f.stat().st_size,
                "modified_at": datetime.fromtimestamp(f.stat().st_mtime).isoformat(),
            }
            for f in files
        ]
    }


@app.get("/api/transcripts/{filename}")
def get_transcript(filename: str):
    clean_name = safe_slug(Path(filename).stem) + ".json"
    target = TRANSCRIPTS_DIR / clean_name
    if not target.exists():
        raise HTTPException(status_code=404, detail="Transcript file not found")
    return FileResponse(target, media_type="application/json", filename=clean_name)


STATIC_DIR = ROOT / "static"

if STATIC_DIR.exists():
    @app.get("/{full_path:path}")
    def serve_static_spa(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API route not found")
        file_path = STATIC_DIR / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        index_path = STATIC_DIR / "index.html"
        if index_path.exists():
            return FileResponse(index_path)
        return JSONResponse({"message": "Index file not found in static directory."})
elif FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}")
    def serve_dist_spa(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API route not found")
        file_path = FRONTEND_DIST / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        index_path = FRONTEND_DIST / "index.html"
        if index_path.exists():
            return FileResponse(index_path)
        return JSONResponse({"message": "Frontend not built yet."})


def main():
    parser = argparse.ArgumentParser(description="Northstar IT Helpdesk Copilot API & Web Server")
    parser.add_argument("--host", default="127.0.0.1", help="Host address (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8000, help="Port (default: 8000)")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload for development")
    args = parser.parse_args()

    print(f"Starting IT Helpdesk Copilot server at http://{args.host}:{args.port}")
    uvicorn.run("server:app", host=args.host, port=args.port, reload=args.reload)


if __name__ == "__main__":
    main()
