# `app/` 模組說明

此目錄包含募資平台的 API 路由、資料模型、Demo 資料與付款實驗端點。目前主要服務是 FastAPI；`CoinSwap.py` 則是尚未整合進主服務的獨立 Flask 實驗程式。

## 目錄結構

```text
app/
├── __init__.py      # 將 app 標記為 Python package
├── main.py          # FastAPI 主程式與 HTTP 路由
├── models.py        # Pydantic request／response 資料模型
├── store.py         # 記憶體資料、Demo 專案與商業邏輯
├── treasury_wallet.py  # 平台金庫的 devnet 簽署／送款
├── chain_verify.py  # 驗證 client 回報的 txSignature 是否為真實鏈上轉帳
└── CoinSwap.py       # 獨立的 Flask 付款接收實驗端點
```

## `main.py`

FastAPI 的進入點，建立 `app = FastAPI(...)`，設定 CORS，接收前端請求並呼叫 `store.py` 執行實際操作。

主要路由包括：

- `GET /health`：健康檢查。
- `GET /config`：回傳 Solana treasury、cluster 與 Demo 換算設定。
- `GET /campaigns`：取得所有募資專案。
- `GET /campaigns/{slug}`：取得單一專案。
- `GET /campaigns/{slug}/donations`：取得回饋型專案的認購／留言紀錄。
- `GET /campaigns/{slug}/position`：取得目前 Demo 投資人的持倉。
- `GET /campaigns/{slug}/transactions`：取得已記錄的 Solana 交易。
- `POST /campaigns/{slug}/donate`：認購回饋型方案。
- `POST /campaigns/{slug}/buy-shares`：購買投資型 RWA Token。
- `POST /campaigns/{slug}/sell`：賣出／贖回 RWA Token（見下方「賣出／贖回」）。
- `POST /campaigns/{slug}/claim-reward`：領取待領收益。
- `GET /wallets/{address}/balance`：查詢這個錢包的可投資餘額（見下方「使用者資金帳本」）。
- `POST /wallets/{address}/deposit`：回報一筆已完成的真實 devnet 儲值，入帳到可投資餘額。

以下路由曾出現在規劃中但尚未實作：`POST /campaigns/{slug}/settle`（年度結算）、
`POST /campaigns/{slug}/buyback`（發行方買回，語意上已被 `/sell` 取代）、
`POST /campaigns/{slug}/status`（切換投資型專案狀態）。

路由層負責驗證輸入及轉換 HTTP 錯誤；資料異動則交由 `store.py` 處理。

## `models.py`

集中定義 Pydantic 模型，欄位名稱需與 `fundraising-frontend/lib/types.ts` 保持一致，否則前端取得 JSON 後可能出現型別或顯示問題。

模型大致分為三組：

- 專案資料：`Campaign`、`RewardTier`、`InvestmentTerms`。
- 投資與交易資料：`InvestorPosition`、`Donation`、`OnChainTransaction`、`OnChainRedemption`。
- API 輸入輸出：`DonateRequest`、`BuySharesRequest`、`SellRequest`、`SellResult`、`ConfigResponse`、`ActionResult`。

其中 `ProjectStatus` 的值為：

- `1`：正常運作。
- `2`：僅開放提領。
- `3`：全面停止。

## `store.py`

目前的資料儲存與商業邏輯層。它使用 Python list 保存資料，沒有連接資料庫，因此服務重啟後，所有執行期間的新增或異動都會消失並重新載入種子資料。

主要內容包括：

- 六個 Demo 募資專案及初始投資／留言資料。
- 回饋型專案的認購、數量與募資金額更新。
- 投資型專案的 Token 購買、年度結算、收益領取與發行方買回。
- Solana Demo 交易簽章紀錄。
- `reset_for_tests()` 測試重置功能。

Solana 相關環境變數：

- `SOLANA_TREASURY_ADDRESS`：Demo 收款地址。
- `SOLANA_CLUSTER`：預設為 `devnet`。
- `SOLANA_RPC_URL`（見 `app/treasury_wallet.py`）：預設為 `https://api.devnet.solana.com`。

`LAMPORTS_PER_SHARE_UNIT` 目前固定為 `1_000_000`，也就是每一單位以 `0.001 SOL` 作為 Demo 支付額；這不是 TWDT 與 SOL 的真實匯率。

### 賣出／贖回

這個平台是募資架構，沒有次級市場、沒有即時價格，所以「賣出」實際上是照原發行單價向發行方贖回，而不是市場交易：

- 投資型專案：`sell_shares`／`preview_sell_shares` 依 `LAMPORTS_PER_SHARE_UNIT` 計算退款，並用 `get_wallet_shares_held` 依這個錢包實際的鏈上購買紀錄（`onchain_transactions` 減掉先前贖回）驗證持有量，避免賣出超過它真的買過的份數；不使用 Demo 用的共用 `investor_positions`（那個部位不分錢包，任何人買都會加到同一個 Demo 部位）。
- 回饋型專案：`preview_redeem_donation` 找出這個錢包在該方案尚未贖回的認購紀錄，取消並標記 `Donation.redeemed = True`。

退款是由 `app/treasury_wallet.py` 用平台金庫的 devnet 私鑰（`.devnet-keys/treasury.json`，已加入 `.gitignore`）簽署並送出的真實鏈上轉帳——買入時是 rwa-agent 的錢包付款給金庫，賣出時方向相反，只有握有金庫私鑰的這一端能簽這筆退款，因此無法比照買入讓呼叫端先付款。`POST /campaigns/{slug}/sell` 因此固定「先驗證→送出鏈上退款→成功才更新募資狀態」的順序，讓鏈上付款失敗時不會留下狀態不一致的假交易。

### 使用者資金帳本

AI Agent 用自己名下「共用」的一個 devnet 錢包幫所有使用者代操買賣，因此需要另一層記帳，追蹤這個共用錢包裡的錢有多少實際屬於哪個使用者：

- `POST /wallets/{address}/deposit`：使用者把真實 devnet SOL 轉進 agent 的錢包後回報這筆交易，入帳到 `store.wallet_ledger_balances[address]`。
- `GET /wallets/{address}/balance`：查詢這個可投資餘額。
- `buy-shares`／`donate` 的 `viaLedger=true`：agent 代使用者下單時，從這筆餘額扣款（`debit_ledger`），持倉歸戶到這個使用者的錢包，而不是 agent 自己的錢包。
- `/sell` 的 `viaLedger=true`：贖回時把款項退回這個使用者的可投資餘額（`credit_ledger`），而不是送出一筆真實鏈上退款——因為這筆錢原本就沒有離開共用錢包。

目前沒有「提領」端點：可投資餘額只能靠買了再賣的方式間接變現。

### 鏈上驗證（`chain_verify.py`）

`buy-shares`／`donate`／`deposit` 都接受 client 回報的 `txSignature`；如果不驗證這筆簽章是否真的對應到一筆鏈上轉帳，之後的 `/sell` 就可能付出真實退款給一筆從未真正付款的紀錄。因此只要請求同時帶了 `txSignature` 與 `walletAddress`（兩者缺一，這筆紀錄本來就不可能被贖回，見 `get_wallet_shares_held`／`preview_redeem_donation`），`app/main.py` 就會先呼叫 `chain_verify.verify_spent_at_least` 確認這筆簽章是一筆已確認、且從這個錢包實際轉出至少宣稱金額的真實交易，驗證失敗回傳 `400`。同一筆簽章也只能被認列一次（`store.claim_tx_signature`），避免用同一筆真實付款重複兌現多筆購買或儲值紀錄。

## `CoinSwap.py`

獨立的 Flask 實驗服務，提供 `POST /payment`，預期接收：

```json
{
  "projectName": "職人手作中秋月餅禮盒",
  "rwaTokenAmount": 10,
  "walletAddress": "DemoWalletAddress"
}
```

目前它會驗證 JSON、專案名稱、Token 數量與錢包地址；合法請求會回傳 `200` 與 `ok: true` 的 Demo 確認結果。它尚未實作 RWA Token 轉移，也尚未接入 `main.py`。

目前限制：

- 預設連接埠也是 `8000`，與 FastAPI 同時啟動時會衝突；可透過 `COIN_SWAP_PORT` 改用其他連接埠。
- 此端點目前不會驗證鏈上付款，也不會發送 Token。

在 `fundraising-api/` 目錄單獨啟動此 Demo 服務：

```powershell
$env:COIN_SWAP_PORT = "8001"
uv run python app/CoinSwap.py
```

## 主要資料流

```text
fundraising-frontend
        │ HTTP / JSON
        ▼
     main.py
        │ Pydantic models
        ▼
     store.py
        │
        └── 記憶體中的專案、持倉、留言與交易紀錄
```

`CoinSwap.py` 目前位於上述主資料流之外，是單獨啟動的付款功能草稿。

## 啟動主 API

在 `fundraising-api/` 目錄執行：

```powershell
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

啟動後可開啟 `http://127.0.0.1:8000/docs` 查看 FastAPI 自動產生的 API 文件。
