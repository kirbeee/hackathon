# `app/` 模組說明

此目錄包含募資平台的 API 路由、資料模型、Demo 資料與付款實驗端點。目前主要服務是 FastAPI；`CoinSwap.py` 則是尚未整合進主服務的獨立 Flask 實驗程式。

## 目錄結構

```text
app/
├── __init__.py   # 將 app 標記為 Python package
├── main.py       # FastAPI 主程式與 HTTP 路由
├── models.py     # Pydantic request／response 資料模型
├── store.py      # 記憶體資料、Demo 專案與商業邏輯
└── CoinSwap.py   # 獨立的 Flask 付款接收實驗端點
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
- `POST /campaigns/{slug}/claim-reward`：領取待領收益。
- `POST /campaigns/{slug}/settle`：執行年度結算。
- `POST /campaigns/{slug}/buyback`：執行發行方買回。
- `POST /campaigns/{slug}/status`：切換投資型專案狀態。
- `POST /campaigns`：建立新的回饋型專案。

路由層負責驗證輸入及轉換 HTTP 錯誤；資料異動則交由 `store.py` 處理。

## `models.py`

集中定義 Pydantic 模型，欄位名稱需與 `fundraising-frontend/lib/types.ts` 保持一致，否則前端取得 JSON 後可能出現型別或顯示問題。

模型大致分為三組：

- 專案資料：`Campaign`、`RewardTier`、`InvestmentTerms`。
- 投資與交易資料：`InvestorPosition`、`Donation`、`OnChainTransaction`。
- API 輸入輸出：`DonateRequest`、`BuySharesRequest`、`CreateCampaignRequest`、`SetStatusRequest`、`ConfigResponse`、`ActionResult`。

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
- 新專案建立與 slug 產生。
- `reset_for_tests()` 測試重置功能。

Solana 相關環境變數：

- `SOLANA_TREASURY_ADDRESS`：Demo 收款地址。
- `SOLANA_CLUSTER`：預設為 `devnet`。

`LAMPORTS_PER_SHARE_UNIT` 目前固定為 `1_000_000`，也就是每一單位以 `0.001 SOL` 作為 Demo 支付額；這不是 TWDT 與 SOL 的真實匯率。

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
