"""The platform treasury's own Solana devnet wallet.

Holds the real devnet keypair that receives buy/donate payments (see
app/store.py's SOLANA_TREASURY_ADDRESS) -- rwa-agent's wallet pays *into*
this address. Selling/redeeming reverses that: only whoever holds this
keypair can sign a refund back out of the treasury, so that leg has to run
here in the backend rather than in rwa-agent.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

from solana.rpc.async_api import AsyncClient
from solana.rpc.commitment import Confirmed
from solana.rpc.models import TxOpts
from solders.keypair import Keypair
from solders.message import MessageV0
from solders.pubkey import Pubkey
from solders.system_program import TransferParams, transfer
from solders.transaction import VersionedTransaction

_KEYPAIR_PATH = Path(__file__).resolve().parent.parent / ".devnet-keys" / "treasury.json"
SOLANA_RPC_URL = os.environ.get("SOLANA_RPC_URL", "https://api.devnet.solana.com")

_FEE_BUFFER_LAMPORTS = 10_000
_MAX_SEND_ATTEMPTS = 3


class InsufficientTreasuryFundsError(RuntimeError):
    """Raised when the treasury wallet doesn't hold enough devnet SOL to pay out a refund."""


def _load_keypair() -> Keypair:
    if not _KEYPAIR_PATH.exists():
        raise RuntimeError(
            f"Treasury devnet keypair not found at {_KEYPAIR_PATH}. Selling/redemption "
            "needs the same treasury keypair buy/donate payments are sent to."
        )
    secret = json.loads(_KEYPAIR_PATH.read_text())
    return Keypair.from_bytes(bytes(secret))


_keypair = _load_keypair()


def treasury_pubkey() -> str:
    return str(_keypair.pubkey())


async def get_balance_lamports() -> int:
    async with AsyncClient(SOLANA_RPC_URL) as client:
        resp = await client.get_balance(_keypair.pubkey(), commitment=Confirmed)
        return resp.value


async def send_payment(to_address: str, lamports: int) -> str:
    """Send a real devnet SOL refund from the treasury wallet, returning the tx signature."""
    to_pubkey = Pubkey.from_string(to_address)

    async with AsyncClient(SOLANA_RPC_URL) as client:
        balance = (await client.get_balance(_keypair.pubkey(), commitment=Confirmed)).value
        if balance < lamports + _FEE_BUFFER_LAMPORTS:
            raise InsufficientTreasuryFundsError(
                f"Treasury wallet {treasury_pubkey()} has {balance} lamports and needs "
                f"{lamports} to refund this sell, plus fees. Fund it manually via "
                f"https://faucet.solana.com or a transfer from another devnet wallet."
            )

        instruction = transfer(
            TransferParams(
                from_pubkey=_keypair.pubkey(),
                to_pubkey=to_pubkey,
                lamports=lamports,
            )
        )

        last_error: Exception | None = None
        for _ in range(_MAX_SEND_ATTEMPTS):
            blockhash_resp = await client.get_latest_blockhash(commitment=Confirmed)
            recent_blockhash = blockhash_resp.value.blockhash
            message = MessageV0.try_compile(
                _keypair.pubkey(), [instruction], [], recent_blockhash
            )
            transaction = VersionedTransaction(message, [_keypair])

            try:
                send_resp = await client.send_transaction(
                    transaction,
                    opts=TxOpts(skip_preflight=True, preflight_commitment=Confirmed),
                )
                signature = send_resp.value
                await client.confirm_transaction(signature, commitment=Confirmed)
                return str(signature)
            except Exception as e:  # noqa: BLE001 - retry on any send/confirm failure
                last_error = e

        assert last_error is not None
        raise last_error
