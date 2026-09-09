# backend

[![FastAPI](https://img.shields.io/badge/FastAPI-backend-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![Pydantic](https://img.shields.io/badge/Pydantic-models-E92063?style=flat-square&logo=pydantic&logoColor=white)](https://docs.pydantic.dev/)
[![Solana](https://img.shields.io/badge/Solana-Devnet-9945FF?style=flat-square&logo=solana&logoColor=white)](https://solana.com/)
[![uv](https://img.shields.io/badge/uv-package_manager-DE5FE9?style=flat-square&logo=uv&logoColor=white)](https://docs.astral.sh/uv/)

JSON API serving RWA campaign data to `frontend` (Next.js) and the separate
wallet-connect frontend. This is a mock data layer — a Python port of what
used to live in `frontend/lib/campaigns.ts` — it does not call the
`contractTest` smart contracts or any wallet/chain. Investment-model
campaigns mirror `contractTest/contracts/SafeHarvestNFT.sol`'s field shapes,
but mutations here only change this process's in-memory Python state.

## Run it

```bash
cd backend
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

All state resets when the process restarts. CORS is wide open (`*`) for local
hackathon use across multiple frontend origins — tighten `CORS_ALLOW_ORIGINS`
before any real deployment.

Full request/response shapes for every endpoint here, plus `rwa-agent` and the
frontend's proxy route, are in [`../API.md`](../API.md).
