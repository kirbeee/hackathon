"""Minimal Flask endpoint for the frontend RWA Token purchase demo."""

from __future__ import annotations

import os
from decimal import Decimal, InvalidOperation
from flask import Flask, jsonify, request


app = Flask(__name__)


@app.post("/payment")
def receive_payment():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"ok": False, "error": "Request body must be JSON."}), 400

    project_name = str(payload.get("projectName", "")).strip()
    rwa_token_amount_raw = payload.get("rwaTokenAmount")
    wallet_address = str(payload.get("walletAddress", "")).strip()

    if not project_name:
        return jsonify({"ok": False, "error": "projectName is required."}), 400
    if rwa_token_amount_raw is None:
        return jsonify({"ok": False, "error": "rwaTokenAmount is required."}), 400
    if not wallet_address:
        return jsonify({"ok": False, "error": "walletAddress is required."}), 400

    try:
        rwa_token_amount = Decimal(str(rwa_token_amount_raw))
    except (InvalidOperation, ValueError):
        return jsonify({"ok": False, "error": "rwaTokenAmount must be a number."}), 400

    if not rwa_token_amount.is_finite() or rwa_token_amount <= 0:
        return jsonify({"ok": False, "error": "rwaTokenAmount must be greater than 0."}), 400

    # Demo acknowledgement only. The actual RWA Token transfer must be added
    # after the mint, signing authority, and chain integration are defined.
    return jsonify(
        {
            "ok": True,
            "message": "Payment report accepted; RWA Token transfer is not implemented yet.",
            "projectName": project_name,
            "rwaTokenAmount": str(rwa_token_amount),
            "walletAddress": wallet_address,
        }
    )


if __name__ == "__main__":
    app.run(
        host=os.getenv("COIN_SWAP_HOST", "127.0.0.1"),
        port=int(os.getenv("COIN_SWAP_PORT", "8000")),
        debug=os.getenv("COIN_SWAP_DEBUG", "false").lower() == "true",
    )
