# fundraising-api

JSON API serving RWA campaign data to `fundraising-frontend` (Next.js) and the
separate wallet-connect frontend. This is a mock data layer — a Python port of
what used to live in `fundraising-frontend/lib/campaigns.ts` — it does not call
the `contractTest` smart contracts or any wallet/chain. Investment-model
campaigns mirror `contractTest/contracts/SafeHarvestNFT.sol`'s field shapes and
state machine (buy shares → annual settlement → farmer buyback → claim), but
mutations here only change this process's in-memory Python state.

## Run it

```bash
cd fundraising-api
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

Interactive docs at `http://localhost:8000/docs` once it's running.

## Test it

```bash
uv run pytest -q
```

## Endpoints

- `GET /campaigns` — list all campaigns
- `GET /campaigns/{slug}` — one campaign's full detail
- `GET /campaigns/{slug}/donations` — comments/backers for a reward-tier campaign
- `GET /campaigns/{slug}/position` — the (single, mock) demo investor's position in an investment-model campaign
- `POST /campaigns/{slug}/donate` — back a reward tier: `{tierId, backerName, message}`
- `POST /campaigns/{slug}/buy-shares` — buy investment shares: `{amount}`
- `POST /campaigns/{slug}/claim-reward` — claim pending dividends
- `POST /campaigns/{slug}/settle` — run annual settlement (demo admin action)
- `POST /campaigns/{slug}/buyback` — farmer buys back all shares (demo admin action)
- `POST /campaigns/{slug}/status` — set project status: `{status: 1|2|3}` (demo admin action)
- `POST /campaigns` — create a new reward-tier campaign

All state resets when the process restarts. CORS is wide open (`*`) for local
hackathon use across multiple frontend origins — tighten `CORS_ALLOW_ORIGINS`
before any real deployment.

Full request/response shapes for every endpoint here, plus `rwa-agent` and the
frontend's proxy route, are in [`../API.md`](../API.md).
