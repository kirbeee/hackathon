from __future__ import annotations

from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None
    # The human's connected Phantom wallet address, if any -- see
    # app/agent.py's stream_chat docstring for how this scopes buy/sell to
    # this user's own custodial ledger balance instead of the agent's pool.
    wallet_address: str | None = None
