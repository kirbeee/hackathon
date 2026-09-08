import asyncio
import json

from app import fundraising_client, solana_wallet


async def main():
    slug = "friendly-citrus-orchard-transition"
    amount = 1

    campaign = await fundraising_client.get_campaign(slug)
    print(f"campaign: {campaign['title']} ({slug})")
    print(f"before: mintedShares={campaign['investment']['mintedShares']} / {campaign['investment']['totalShares']}")

    agent_balance_before = await solana_wallet.get_balance_lamports()
    print(f"agent wallet {solana_wallet.agent_pubkey()} balance before: {agent_balance_before} lamports")

    result = await fundraising_client.sell(slug, solana_wallet.agent_pubkey(), amount=amount)
    print("fundraising-api response:", json.dumps(result, ensure_ascii=False))
    print(f"explorer: https://explorer.solana.com/tx/{result['txSignature']}?cluster=devnet")

    agent_balance_after = await solana_wallet.get_balance_lamports()
    print(f"agent wallet balance after: {agent_balance_after} lamports")

    campaign_after = await fundraising_client.get_campaign(slug)
    print(f"after: mintedShares={campaign_after['investment']['mintedShares']} / {campaign_after['investment']['totalShares']}")


if __name__ == "__main__":
    asyncio.run(main())
