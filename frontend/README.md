# 拾光募資

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-149ECA?style=flat-square&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Solana](https://img.shields.io/badge/Solana-Devnet-9945FF?style=flat-square&logo=solana&logoColor=white)](https://solana.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-backend-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![uv](https://img.shields.io/badge/uv-package_manager-DE5FE9?style=flat-square&logo=uv&logoColor=white)](https://docs.astral.sh/uv/)

RWA（Real World Asset）群眾募資平台前端原型。讓小農地轉型、新創研發這類傳統上只有大型機構能參與的資金需求，透過 RWA Token 轉為面向大眾的模式；同時也涵蓋嘖嘖式的傳統募資商品（眼鏡、月餅禮盒、咖啡機等）。

## 這個專案能做什麼

- **瀏覽 / 搜尋募資專案**，依分類篩選（永續農業、新創研發、生活選物、科技 3C、飲食禮盒、設計工藝）
- **贊助傳統商品類專案**：選一個 RWA Token 回饋方案，取得對應的商品／服務
- **投資投資型專案**（機制對齊 `contractTest` 的 SafeHarvestNFT 合約）：購買股份、查看年度結算分潤、領取待領分紅
- **發起新的募資專案**（reward 型，可自訂多個 RWA Token 回饋方案）
- **連接 Solana 錢包**（Phantom 等 Wallet Standard 相容錢包），贊助與購買股份時會透過錢包發送真實的 Devnet SOL 轉帳作為付款證明，交易可在 Solana Explorer 上查證

## 本地端怎麼起服務

這個專案**沒有自己的資料庫／後端邏輯**，資料跟 AI Agent 都來自另外兩個獨立服務。要完整體驗（含 AI Agent 聊天）得開 **3 個終端機視窗**，照順序啟動：

### 1. `backend`（必要，資料層，port 8000）

```bash
cd ../fundraising-api
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

確認 http://127.0.0.1:8000/health 回傳 `{"status":"ok"}`。純記憶體狀態，重啟這個服務資料會整個重置。

### 2. `rwa-agent`（選用，AI Agent 聊天用，port 8100）

只有 `/agent` 頁面的 AI Agent 聊天需要它；不開這個，其他頁面（瀏覽、贊助、投資）都正常運作。

```bash
cd ../rwa-agent
uv sync
cp .env.example .env   # 填入 OPENAI_API_KEY
uv run uvicorn app.main:app --reload --port 8100
```

### 3. `fundraising-frontend`（這個專案，port 3000）

```bash
npm install
cp .env.example .env.local   # 預設值即可本機開發，不用改
npm run dev
```

打開 http://localhost:3000。

**啟動順序很重要**：`fundraising-frontend` 在 Server Components 渲染頁面時會直接打 `backend`，`backend` 沒起來的話首頁會直接噴錯；`rwa-agent` 沒起來時 `/agent` 的聊天會顯示「無法連線到 rwa-agent」，但不影響其他頁面。

## Cloudflare Tunnel（把本機服務公開到網路上）

Hackathon demo 情境下常常需要讓別人（評審、隊友的手機）連到你本機跑的服務。做法是用 [`cloudflared`](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) 開一個 **quick tunnel**，不需要 Cloudflare 帳號也不需要網域。

### 安裝 cloudflared

```bash
# Windows (winget)
winget install --id Cloudflare.cloudflared

# macOS
brew install cloudflared
```

### 只需要對外公開前端（一般情況）

`backend`（8000）跟 `rwa-agent`（8100）**不需要**、也**不應該**直接暴露在公開網路上——它們沒有任何驗證機制，CORS 又全開。前端的 Server Actions／`/api/agent/chat` proxy 會在同一台機器上幫你轉發，所以只要對外開一個 tunnel 指到 3000 就夠：

```bash
# fundraising-frontend 已經在跑（npm run dev, port 3000）
cloudflared tunnel --url http://localhost:3000
```

終端機會印出一個 `https://<隨機字串>.trycloudflare.com` 網址，分享這個連結出去即可。`next.config.ts` 裡的 `allowedDevOrigins` 已經預先允許了 `*.trycloudflare.com`（Next.js dev server 預設只信任 `localhost`，沒開這個 quick tunnel 打開會直接 hydration 失敗），所以**不用額外設定**就能直接用；每次重開 tunnel 網址都會換，是正常現象。

> 這個網址只代理你本機的 `fundraising-frontend`（3000）。`backend`／`rwa-agent` 還是走 `127.0.0.1`，只有跑在同一台機器上的 Next.js 伺服器連得到——這也是為什麼 `/api/agent/chat` proxy 要存在（見下面「AI Agent 串接」）。

### 如果真的需要讓別人的機器直接打 fundraising-api

正常不需要（瀏覽器端付款流程用的是 `NEXT_PUBLIC_FUNDRAISING_API_URL`，如果你的觀眾是打你的 tunnel 網址、不是自己跑一份前端，這個值維持 `127.0.0.1:8000` 完全沒問題，因為瀏覽器端程式碼實際上是從觀眾自己的瀏覽器往你的 tunnel 域名發請求，而 Next.js 伺服器再往你本機的 8000 轉發）。真的要獨立公開 `backend` 時（例如隊友要在自己電腦上跑前端，接你這台的資料），另外開一個 tunnel：

```bash
cloudflared tunnel --url http://localhost:8000
```

拿到的網址設進對方 `.env.local` 的 `FUNDRAISING_API_URL` / `NEXT_PUBLIC_FUNDRAISING_API_URL`。

## API 串接：三個服務怎麼接在一起

完整的 request/response 欄位定義在根目錄的 [`../API.md`](../API.md)，以下是這個前端專案怎麼呼叫它們：

```
瀏覽器
  │
  │ Server Components / Server Actions（lib/campaigns.ts, lib/actions.ts）
  │   → 讀 FUNDRAISING_API_URL（server-only env，預設 127.0.0.1:8000）
  ▼
Next.js 伺服器（fundraising-frontend, :3000）
  │
  ├─ 瀏覽器端付款流程（贊助／購買股份的 useTreasuryPayment）
  │   直接從瀏覽器打 NEXT_PUBLIC_FUNDRAISING_API_URL（同一份 8000）
  │   → 送出真的 Devnet SOL 轉帳後，把 txSignature 存回 fundraising-api
  │
  └─ AI Agent 聊天（app/api/agent/chat/route.ts）
      瀏覽器 → 同源 /api/agent/chat（不直接連 rwa-agent）
              → Next.js 伺服器轉發到 RWA_AGENT_URL（server-only，預設 127.0.0.1:8100）
              → 原樣把 rwa-agent 的 SSE 串流接回瀏覽器
```

三個對接點，對應 [`lib/api-client.ts`](lib/api-client.ts)、[`lib/campaigns.ts`](lib/campaigns.ts)、[`lib/use-treasury-payment.ts`](lib/use-treasury-payment.ts)、[`app/api/agent/chat/route.ts`](app/api/agent/chat/route.ts)：

1. **`backend`（server-side 讀資料）** — `lib/api-client.ts` 的 `apiGet`/`apiPost` 依執行環境（`typeof window === "undefined"`）自動切換用 `FUNDRAISING_API_URL` 還是 `NEXT_PUBLIC_FUNDRAISING_API_URL`，`lib/campaigns.ts` 的每個函式都是包這兩個 helper。列專案、看詳情、贊助紀錄、持股狀態、發起專案都走這條路。
2. **`backend`（client-side 付款）** — `lib/use-treasury-payment.ts` 的 `useTreasuryPayment()` hook 在瀏覽器端透過連上的 Solana 錢包（`app/providers.tsx` 的 wallet client）簽名送出真的 Devnet SOL 轉帳到 `NEXT_PUBLIC_SOLANA_TREASURY_ADDRESS`，拿到 `txSignature` 後再呼叫 `lib/campaigns.ts` 的 `apiPost`（此時走瀏覽器端，用 `NEXT_PUBLIC_FUNDRAISING_API_URL`）把交易記錄存進 `backend`。**這是唯一真的上鏈的方向**；年度結算、買回、領分紅、狀態切換都只是呼叫 `backend` 的 mock 動作。
3. **`rwa-agent`（AI Agent 聊天，走 proxy）** — `app/api/agent/chat/route.ts` 是唯一知道 `RWA_AGENT_URL` 的地方；瀏覽器只打同源的 `/api/agent/chat`，Next.js 伺服器把 request body 原封轉發給 `rwa-agent` 的 `POST /agent/chat`，再把回應的 `text/event-stream` body 原樣接回去（`upstream.body` 直接當 `Response` body 傳出）。這樣設計是因為 `rwa-agent` 的 8100 埠**不對外公開**，只有本機的 Next.js 伺服器連得到；瀏覽器端也完全不用管理 `RWA_AGENT_URL` 這個變數。連不上 `rwa-agent` 時回 `502 { error }`（JSON，不是 SSE）。

新增或修改任何一個接口時，記得同步更新 [`../API.md`](../API.md)——那份文件是手動維護的，不會自動跟著程式碼變。

## 環境變數（`.env.example`）

| 變數 | 用途 | 預設值 |
| --- | --- | --- |
| `FUNDRAISING_API_URL` | Server Components／Server Actions 呼叫後端用 | `http://127.0.0.1:8000` |
| `NEXT_PUBLIC_FUNDRAISING_API_URL` | 瀏覽器端（贊助／購買股份的付款流程）呼叫後端用，須與上面同步 | `http://127.0.0.1:8000` |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | 錢包連接與交易送出用的 Solana RPC | `https://api.devnet.solana.com` |
| `NEXT_PUBLIC_SOLANA_TREASURY_ADDRESS` | 贊助／購買股份時收款的 Devnet 地址，須與 `backend` 的 `SOLANA_TREASURY_ADDRESS` 一致 | 已內建一組 Devnet 測試地址 |
| `RWA_AGENT_URL` | Server-only，`/api/agent/chat` 轉發 AI Agent 聊天用，**絕不**暴露給瀏覽器 | `http://127.0.0.1:8100` |

## 想要連錢包測試付款流程？

1. 安裝 [Phantom](https://phantom.app) 之類的瀏覽器錢包，網路切到 **Devnet**（Phantom：設定 → Developer Settings → Change Network → Devnet）
2. 去 [faucet.solana.com](https://faucet.solana.com) 領一點 Devnet 測試幣（免費，跟真錢無關）
3. 回到網站右上角點「連接錢包」
4. 進任一個專案，贊助或購買股份時會跳出 Phantom 簽名視窗——簽名後才會真的送出 0.001 SOL／份到平台的 Devnet 收款地址，並在專案頁的「鏈上交易紀錄」顯示、附上 Explorer 連結

**沒接錢包也能逛**：瀏覽、搜尋、發起專案都不需要錢包；只有「贊助」跟「購買股份」這兩個花錢的動作會要求連接。

## 目前的範圍與限制（老實說）

- **年度結算、農夫買回、領取分紅、專案狀態切換**：這些還是純後台模擬（呼叫 `backend` 的 mock 邏輯），不是真的鏈上合約——只有「購買/贊助付款」這個方向做到真實 Devnet 轉帳
- 資料是 `backend` 的記憶體內模擬資料，重啟該服務會整個重置
- 投資型專案的欄位設計對齊 `contractTest` 的 SafeHarvestNFT 合約，但**不是**呼叫那個合約——那是 Solidity/EVM，這裡走的是 Solana，兩者是不同的鏈
- 平台收款地址是一組**只用於 Devnet 的測試錢包**，私鑰檔案在 `../backend/.devnet-keys/`（已 gitignore），沒有任何實際價值

## 開發

```bash
npm run lint
npm run build
```

修改 App Router 相關程式碼前，先看 `node_modules/next/dist/docs/` 對應文件——這個版本的 Next.js（16）跟訓練資料裡熟悉的版本有 breaking changes（例如 `error.tsx` 的重試函式叫 `retry` 不是 `reset`）。元件與 hooks 檔名一律 kebab-case，App Router 保留檔名（`page.tsx`、`layout.tsx` 等）不改。

## 專案結構

Demo 種子專案統一以 **1 USDC = 1 枚 RWA Token** 顯示認購換算，最低 1 枚。投資型專案（含 AI 客服）保留原有付款金額、幣別與 RWA 數量欄位，但購買按鈕只透過 Server Action 向設定的 Endpoint POST `projectName`、`rwaTokenAmount`、`walletAddress`，成功後更新模擬持股；不查錢包餘額、不簽名、不扣 USDC/TWD，也不執行 swap。連接錢包僅用來取得收取 RWA 的地址。其他認購方案仍使用 Devnet USDC 付款。更新種子價格後請重啟後端，並重新整理前端。

付款換算測試（Node.js 24）：`node --test tests/rwa-payment.test.mjs`。

```
app/                      Next.js App Router 頁面
  page.tsx                 首頁（Hero、熱門專案、RWA 流程圖、AI Agent 展示、支持者評價）
  campaigns/                探索專案（列表、篩選）
  campaigns/[slug]/         專案詳情（reward 或 investment 兩種版面）
  campaigns/new/            發起專案表單
  providers.tsx             Solana wallet client provider
  api/agent/chat/route.ts   AI Agent 聊天 proxy（同源轉發到 rwa-agent）
components/                UI 元件（campaign-card、donate-form、investment-panel、wallet-connect-button…）
lib/
  campaigns.ts              呼叫 fundraising-api 的資料讀取函式
  actions.ts                Server Actions（發起專案、結算/買回/領取/狀態切換等後台模擬動作）
  api-client.ts             fundraising-api 的 fetch 封裝（Server 與 Client 皆可用）
  use-treasury-payment.ts   真實 Solana Devnet 付款的 hook
  types.ts                  對齊 fundraising-api 回傳格式的型別
```
