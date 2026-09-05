"""FastAPI wrapper around the buy-side RWA agent: a conversational,
streaming chat endpoint plus a wallet status check."""

from __future__ import annotations

import json
import uuid
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, StreamingResponse

from app.agent import stream_chat
from app.models import ChatRequest
from app.solana_wallet import agent_pubkey, get_balance_lamports

app = FastAPI(title="RWA Agent", version="0.1.0")

_INDEX_HTML = (Path(__file__).parent / "static" / "index.html").read_text(encoding="utf-8")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", response_class=HTMLResponse)
def index() -> str:
    return _INDEX_HTML


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/agent/status")
async def status() -> dict:
    lamports = await get_balance_lamports()
    return {
        "address": agent_pubkey(),
        "solanaCluster": "devnet",
        "balanceSol": lamports / 1_000_000_000,
    }


@app.post("/agent/chat")
async def chat(request: ChatRequest) -> StreamingResponse:
    session_id = request.session_id or str(uuid.uuid4())

    async def event_stream():
        yield f"data: {json.dumps({'type': 'session', 'session_id': session_id})}\n\n"
        async for event in stream_chat(session_id, request.message):
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
