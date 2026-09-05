"""The agent's own Solana devnet wallet.

Holds a real devnet keypair (play-money only) so buy_rwa can send an actual
on-chain payment to the campaign treasury before recording the purchase in
fundraising-api, the same way fundraising-frontend's wallet-connect flow does
(see fundraising-frontend/lib/use-treasury-payment.ts).
"""

from __future__ import annotations

import json
from pathlib import Path

from solana.exceptions import SolanaRpcException
from solana.rpc.async_api import AsyncClient
from solana.rpc.commitment import Confirmed
from solders.keypair import Keypair
from solders.message import MessageV0
from solders.pubkey import Pubkey
from solders.system_program import TransferParams, transfer
from solders.transaction import VersionedTransaction

from app.settings import settings

_KEYPAIR_PATH = Path(__file__).resolve().parent.parent / ".devnet-keys" / "agent.json"

# Keep a request_airdrop away from the 2 SOL/request devnet faucet cap.
_AIRDROP_LAMPORTS = 1_000_000_000
_FEE_BUFFER_LAMPORTS = 10_000


def _load_or_create_keypair() -> Keypair:
    if _KEYPAIR_PATH.exists():
        secret = json.loads(_KEYPAIR_PATH.read_text())
        return Keypair.from_bytes(bytes(secret))

    keypair = Keypair()
    _KEYPAIR_PATH.parent.mkdir(parents=True, exist_ok=True)
    _KEYPAIR_PATH.write_text(json.dumps(list(bytes(keypair))))
    return keypair


_keypair = _load_or_create_keypair()


def agent_pubkey() -> str:
    return str(_keypair.pubkey())


class InsufficientDevnetFundsError(RuntimeError):
    """Raised when the agent's devnet wallet can't be topped up enough to pay."""


async def get_balance_lamports() -> int:
    async with AsyncClient(settings.solana_rpc_url) as client:
        resp = await client.get_balance(_keypair.pubkey(), commitment=Confirmed)
        return resp.value


async def _ensure_funded(client: AsyncClient, min_lamports: int) -> None:
    balance = (await client.get_balance(_keypair.pubkey(), commitment=Confirmed)).value
    if balance >= min_lamports:
        return

    try:
        airdrop = await client.request_airdrop(_keypair.pubkey(), _AIRDROP_LAMPORTS)
        await client.confirm_transaction(airdrop.value, commitment=Confirmed)
    except SolanaRpcException as e:
        raise InsufficientDevnetFundsError(
            f"Devnet wallet {agent_pubkey()} has {balance} lamports and needs "
            f"{min_lamports}, but the public devnet faucet rejected the airdrop "
            f"request (likely rate-limited for this network today): {e}. "
            f"Fund this address manually via https://faucet.solana.com or a transfer "
            f"from an already-funded devnet wallet, then retry."
        ) from e

    balance = (await client.get_balance(_keypair.pubkey(), commitment=Confirmed)).value
    if balance < min_lamports:
        raise InsufficientDevnetFundsError(
            f"Devnet wallet {agent_pubkey()} has {balance} lamports after airdrop, "
            f"needs {min_lamports}. Devnet faucet may be rate-limited — try again shortly, "
            f"or fund it manually via https://faucet.solana.com."
        )


async def send_payment(to_address: str, lamports: int) -> str:
    """Send a real devnet SOL payment from the agent's wallet, returning the tx signature."""
    to_pubkey = Pubkey.from_string(to_address)

    async with AsyncClient(settings.solana_rpc_url) as client:
        await _ensure_funded(client, lamports + _FEE_BUFFER_LAMPORTS)

        blockhash_resp = await client.get_latest_blockhash(commitment=Confirmed)
        recent_blockhash = blockhash_resp.value.blockhash

        instruction = transfer(
            TransferParams(
                from_pubkey=_keypair.pubkey(),
                to_pubkey=to_pubkey,
                lamports=lamports,
            )
        )
        message = MessageV0.try_compile(
            _keypair.pubkey(), [instruction], [], recent_blockhash
        )
        transaction = VersionedTransaction(message, [_keypair])

        send_resp = await client.send_transaction(transaction)
        signature = send_resp.value
        await client.confirm_transaction(signature, commitment=Confirmed)
        return str(signature)
