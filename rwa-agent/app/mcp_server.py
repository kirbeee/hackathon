"""Exposes the RWA agent's tools (app/tools.py) as a real MCP server, so any
MCP client -- Claude Desktop, another agent, anything speaking the protocol
-- can drive this wallet directly, not just the OpenAI tool-calling loop in
app/agent.py. Both entry points call the exact same functions in app/tools.py;
this file only adds the MCP transport/schema layer on top.

Run it directly for local testing (stdio transport):

    uv run python -m app.mcp_server

Or, once installed, via the console-script entry point:

    uv run rwa-agent-mcp

To use it from an MCP client (e.g. Claude Desktop's `claude_desktop_config.json`):

    {
      "mcpServers": {
        "rwa-agent": {
          "command": "uv",
          "args": ["--directory", "/path/to/rwa-agent", "run", "rwa-agent-mcp"]
        }
      }
    }

Every tool here still talks to the real fundraising-api and sends real
Solana devnet payments from/to the agent's own wallet -- there is no
sandboxing difference versus going through app/agent.py's chat loop.
"""

from __future__ import annotations

from mcp.server.mcpserver import MCPServer

from app import tools

mcp = MCPServer("rwa-agent")


@mcp.tool()
async def get_rwa_assets() -> str:
    """List all RWA campaigns currently open for investment on the platform."""
    return await tools.get_rwa_assets()


@mcp.tool()
async def get_risk_score(slug: str) -> str:
    """Compute a deterministic 0-100 risk score (and low/medium/high level) for
    one campaign by slug. Always call this before deciding to buy or sell."""
    return await tools.get_risk_score(slug)


@mcp.tool()
async def get_market_data(slug: str, user_wallet: str | None = None) -> str:
    """Funding-progress/supply signals for one campaign plus how much of it
    user_wallet currently holds (falls back to the agent's own standalone
    holdings if user_wallet is omitted). There is no live secondary-market
    price here -- this is the closest signal to one, and the only way to know
    current holdings before selling. Always call this before sell_rwa."""
    return await tools.get_market_data(slug, user_wallet=user_wallet)


@mcp.tool()
async def get_wallet_balance(user_wallet: str | None = None) -> str:
    """Get user_wallet's custodial ledger balance (how much devnet SOL
    they've deposited into the agent's wallet and haven't spent yet -- this
    is what actually limits buy_rwa on their behalf) plus the agent's own
    pooled wallet address/SOL balance for reference. Omit user_wallet only
    for a standalone check of the pooled wallet itself."""
    return await tools.get_wallet_balance(user_wallet=user_wallet)


@mcp.tool()
async def buy_rwa(
    slug: str, amount: int = 1, tier_id: str | None = None, user_wallet: str | None = None
) -> str:
    """Buy an RWA token on user_wallet's behalf: pays out of the agent's own
    pooled devnet wallet, debiting the cost from user_wallet's custodial
    ledger balance (see get_wallet_balance) -- fails if that balance is too
    low, even if the pooled wallet itself has enough SOL. Then records the
    purchase in fundraising-api under user_wallet's holdings. Omitting
    user_wallet falls back to the agent's own pubkey with no ledger
    involved (matches the original buy-only, single-wallet behavior). For
    an 'investment' campaign, `amount` is the number of shares to buy. For
    a 'reward' campaign, `tier_id` selects which reward tier to back (one
    unit per call)."""
    return await tools.buy_rwa(slug, amount, tier_id, user_wallet=user_wallet)


@mcp.tool()
async def sell_rwa(
    slug: str, amount: int | None = None, tier_id: str | None = None, user_wallet: str | None = None
) -> str:
    """Sell an RWA token back to the issuer on user_wallet's behalf: the
    refund is credited straight back to user_wallet's own custodial ledger
    balance, not sent as a separate on-chain payment, since the cash never
    left the agent's pooled wallet in the first place. Omitting user_wallet
    falls back to a real on-chain refund to the agent's own pubkey (matches
    the original single-wallet behavior). There is no secondary market, so
    this redeems at the same demo unit price it was bought at. For an
    'investment' campaign, `amount` is the number of shares to sell (must
    not exceed get_market_data's heldShares). For a 'reward' campaign,
    `tier_id` cancels one already-backed pledge of that tier."""
    return await tools.sell_rwa(slug, amount, tier_id, user_wallet=user_wallet)


def main() -> None:
    mcp.run()


if __name__ == "__main__":
    main()
