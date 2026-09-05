# rwa-agent

Automated **buy-side** AI agent for the RWA fundraising platform (hackathon
`hackathon/README.md` §10 MCP tool list, phase 1: buy only, no `sell_rwa` /
`get_market_data` yet).

The user talks to it like a chat assistant — stating budget, risk tolerance,
preferred categories in plain language, over one or more messages — rather
than filling in a fixed form. When it has enough to act, the agent:

1. Lists open campaigns from `fundraising-api` (`get_rwa_assets`).
2. Scores each one's risk **deterministically** in Python, not via the LLM
   (`get_risk_score` — see `app/risk.py`).
3. Checks its own Solana devnet wallet balance (`get_wallet_balance`).
4. Decides what to buy, then actually pays for it: sends a real devnet SOL
   payment from its own keypair to the campaign treasury and records the
   purchase via `fundraising-api` (`buy_rwa`).

The LLM (OpenAI, via standard Chat Completions tool-calling, `stream=True`)
only plans and narrates; every number that matters (risk score, balance,
payment amount) is computed or executed in Python and handed to it as a
tool result. `POST /agent/chat` streams the whole thing back over SSE as it
happens — text tokens as they're generated, plus a `tool_call`/`tool_result`
event pair around each tool the agent actually runs — so a UI can show "查
詢 RWA 清單中…" / "計算風險分數中…" live instead of a blank spinner.

## Run it

Needs `fundraising-api` running first (it's the data/action layer this agent
calls into):

```bash
cd fundraising-api
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

Then, in a second terminal:

```bash
cd rwa-agent
uv sync
cp .env.example .env   # fill in OPENAI_API_KEY
uv run uvicorn app.main:app --reload --port 8100
```

Env vars (`.env`, see `.env.example`):

- `OPENAI_API_KEY` — required.
- `OPENAI_MODEL` — defaults to `gpt-4o-mini`.
- `FUNDRAISING_API_URL` — defaults to `http://127.0.0.1:8000`.
- `SOLANA_RPC_URL` — defaults to `https://api.devnet.solana.com`.

Both `fundraising-api` and `rwa-agent` hold in-memory/on-disk state that
doesn't survive a restart of either process independently — if you restart
`fundraising-api` mid-demo, campaign data resets to seed data but the agent's
wallet keypair/balance are untouched (they live in `rwa-agent/.devnet-keys/`).

## Try it

Open `http://127.0.0.1:8100/` for a minimal built-in chat page (`app/static/index.html`,
served at `/`) — type a message, watch tool calls and the reply stream in live.
No build step, no separate frontend; it's plain HTML/JS reading the same SSE
stream `curl` shows below.

```bash
curl http://127.0.0.1:8100/agent/status
# {"address":"<devnet pubkey>","solanaCluster":"devnet","balanceSol":0.0}

curl -N -X POST http://127.0.0.1:8100/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "我想投資農業類，中度風險，預算 0.01 SOL，先幫我分析一下有哪些選擇跟風險，還不要真的下單。"}'
```

(`-N` disables curl's output buffering so you see events as they stream in,
same as a browser's `EventSource` would.)

Verified end-to-end against live `fundraising-api` data and the real OpenAI
API. The first response includes a `session_id` — pass it back on the next
call's `session_id` field to continue the same conversation; the agent
remembers earlier tool results (e.g. a risk score it already looked up)
without re-calling the tool. Example trace with an empty wallet — the agent
calls `get_rwa_assets` then `get_risk_score` for the matching campaign, sees
0 SOL from `get_wallet_balance`, and narrates the result instead of
hallucinating a purchase (events abridged; `delta` arrives one token/chunk
at a time):

```
data: {"type": "session", "session_id": "ddefa694-..."}
data: {"type": "tool_call", "name": "get_rwa_assets", "arguments": {}}
data: {"type": "tool_result", "name": "get_rwa_assets", "result": "[...]"}
data: {"type": "tool_call", "name": "get_risk_score", "arguments": {"slug": "friendly-citrus-orchard-transition"}}
data: {"type": "tool_result", "name": "get_risk_score", "result": "{\"score\": 24.0, \"level\": \"low\"}"}
data: {"type": "tool_call", "name": "get_wallet_balance", "arguments": {}}
data: {"type": "tool_result", "name": "get_wallet_balance", "result": "{\"lamports\": 0, \"sol\": 0.0}"}
data: {"type": "delta", "content": "目前"}
data: {"type": "delta", "content": "有"}
...
data: {"type": "done"}
```

Once the wallet is funded (see **Wallet** below), a follow-up "幫我下單買一
份" is expected to also show a `buy_rwa` call with a real `txSignature` in
its `tool_result` — that path is implemented and unit-tested piecewise
(`app/risk.py`) but not yet exercised end-to-end, since the devnet faucet
has been rate-limited for this network all session.

## Wallet

On first run, generates its own Solana **devnet** keypair at
`.devnet-keys/agent.json` (gitignored — play money only) and prints/serves
its address via `GET /agent/status`. It self-airdrops devnet SOL when its
balance is too low to cover a purchase; the public devnet faucet is
rate-limited per IP/day, so if a buy fails with "faucet rejected the airdrop
request", fund the printed address manually via https://faucet.solana.com or
a transfer from another devnet wallet.

As of this writing, `https://api.devnet.solana.com`'s faucet has been
returning `429 Too Many Requests` — `"You've either reached your airdrop
limit today or the airdrop faucet has run dry"` — for this network all
session, regardless of the requested amount. `InsufficientDevnetFundsError`
surfaces that verbatim as a `{"type": "error", "message": "..."}` SSE event
instead of a raw traceback or a hung stream. If you hit this: use the web
faucet's UI (different limits/anti-bot path than the raw RPC call) or have a
teammate send SOL directly to the address from `GET /agent/status`.

## Endpoints

- `GET /` — the built-in chat page (`app/static/index.html`)
- `GET /health`
- `GET /agent/status` — agent wallet address + current devnet SOL balance
- `POST /agent/chat` — conversational, streaming (`text/event-stream`):
  ```json
  {"message": "...", "session_id": "optional, omit on the first message"}
  ```
  Conversation history is kept in memory per `session_id` (resets on
  process restart, same tradeoff as `fundraising-api`'s store). Emits one
  SSE `data:` line per event:
  - `{"type": "session", "session_id": "..."}` — always first, echoes/assigns the id.
  - `{"type": "delta", "content": "..."}` — one streamed chunk of assistant text.
  - `{"type": "tool_call", "name": "...", "arguments": {...}}` — the agent decided to call a tool.
  - `{"type": "tool_result", "name": "...", "result": "..."}` — that tool's (JSON-string) return value.
  - `{"type": "done"}` — the turn is finished, safe to stop reading.
  - `{"type": "error", "message": "..."}` — something failed (e.g. insufficient devnet funds); stream ends after this.

## Test it

```bash
uv run pytest -q
```

Only `app/risk.py`'s scoring formula is unit-tested; the OpenAI loop and
Solana payments are exercised manually against live devnet + `fundraising-api`.

Full request/response shapes for every endpoint here, `fundraising-api`, and
the frontend's proxy route are in [`../API.md`](../API.md).
