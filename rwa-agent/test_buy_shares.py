import asyncio
import json

from app import fundraising_client, solana_wallet


async def main():
    slug = "friendly-citrus-orchard-transition"

    campaign = await fundraising_client.get_campaign(slug)
    config = await fundraising_client.get_config()
    treasury = config["solanaTreasuryAddress"]
    lamports_per_unit = config["lamportsPerShareUnit"]
    amount = 1
    lamports = amount * lamports_per_unit

    print(f"campaign: {campaign['title']} ({slug})")
    print(f"before: mintedShares={campaign['investment']['mintedShares']} / {campaign['investment']['totalShares']}")
    print(f"treasury={treasury}  lamports_per_unit={lamports_per_unit}  paying={lamports} lamports")

    agent_balance_before = await solana_wallet.get_balance_lamports()
    print(f"agent wallet {solana_wallet.agent_pubkey()} balance before: {agent_balance_before} lamports")

    signature = await solana_wallet.send_payment(treasury, lamports)
    print(f"sent devnet payment, signature: {signature}")
    print(f"explorer: https://explorer.solana.com/tx/{signature}?cluster=devnet")

    result = await fundraising_client.buy_shares(
        slug, amount, signature, lamports, solana_wallet.agent_pubkey()
    )
    print("fundraising-api response:", json.dumps(result, ensure_ascii=False))

    campaign_after = await fundraising_client.get_campaign(slug)
    print(f"after: mintedShares={campaign_after['investment']['mintedShares']} / {campaign_after['investment']['totalShares']}")


asyncio.run(main())
