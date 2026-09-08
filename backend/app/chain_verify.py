"""Verifies a client-reported devnet SOL transfer actually happened on-chain.

buy-shares/donate/deposit all accept a client-supplied txSignature and, until
this module existed, just trusted it -- but sell/redeem later pays out real
devnet SOL from the treasury based on exactly those recorded purchases (see
app/store.py's sell/redeem and custodial-ledger sections). Without checking
the signature, a fabricated one lets a caller record a purchase that was
never paid for, then redeem it for a real refund. This checks the claimed
sender's balance actually dropped by at least the claimed amount in a
confirmed transaction with that exact signature -- proof they really moved
that much devnet SOL, not just a plausible-looking string.

It deliberately does not require every party in the transaction to match a
particular recipient: a viaLedger purchase is paid by the agent's own pooled
wallet on the caller's behalf, not by the wallet being credited, so pinning
a fixed sender/recipient pair here would reject legitimate agent-paid
purchases. What it guarantees is narrower but load-bearing: the signature is
real, confirmed, and moved at least the claimed amount out of the claimed
wallet -- so redeeming it back can never pay out more real SOL than the
claimant already proved they were willing to spend.
"""

from __future__ import annotations

from solana.rpc.async_api import AsyncClient
from solana.rpc.commitment import Confirmed
from solders.signature import Signature

from app.treasury_wallet import SOLANA_RPC_URL


class TransferVerificationError(RuntimeError):
    """A client-reported txSignature doesn't hold up as real proof of payment."""


async def verify_spent_at_least(signature: str, from_address: str, min_lamports: int) -> None:
    """Raises TransferVerificationError unless `signature` is a confirmed
    devnet transaction whose first account is `from_address` and whose SOL
    balance dropped by at least `min_lamports` (transfer amount + fee, if
    `from_address` was also the fee payer)."""
    try:
        parsed_signature = Signature.from_string(signature)
    except ValueError as e:
        raise TransferVerificationError(f"交易簽章格式不正確：{e}") from e

    async with AsyncClient(SOLANA_RPC_URL) as client:
        resp = await client.get_transaction(
            parsed_signature, commitment=Confirmed, max_supported_transaction_version=0
        )
        tx = resp.value
        if tx is None:
            raise TransferVerificationError("在鏈上找不到這筆交易，或尚未確認。")

        meta = tx.transaction.meta
        if meta is None or meta.err is not None:
            raise TransferVerificationError("這筆交易在鏈上執行失敗。")

        account_keys = [str(key) for key in tx.transaction.transaction.message.account_keys]
        try:
            from_index = account_keys.index(from_address)
        except ValueError:
            raise TransferVerificationError("這筆交易的付款方跟提供的錢包地址不符。") from None

        spent = meta.pre_balances[from_index] - meta.post_balances[from_index]
        if spent < min_lamports:
            raise TransferVerificationError(
                f"這筆交易實際只從 {from_address} 轉出 {spent} lamports，"
                f"不足宣稱的 {min_lamports} lamports。"
            )
