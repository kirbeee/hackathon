# RWA × AI Agent 智能投資募資平台

> **AI Agent × RWA × Blockchain**
>
> 讓創意被資產化，讓投資被自動化。

## 1. 專案簡介

本專案是一個結合 **Real World Assets（RWA）、區塊鏈智能合約與 AI Agent** 的新型募資與投資平台。

我們希望解決傳統募資與投資市場中兩個核心問題：

1. **有好的創意／專案，卻缺乏資金**
2. **一般投資人想參與投資，但缺乏專業分析與持續管理能力**

因此，我們建立一個 RWA 募資平台，將實體資產、專案價值或未來可兌現的資產，以 Token 的形式映射到區塊鏈上。

投資人可以透過錢包參與投資，而 AI Agent 則扮演「**基金經理人**」的角色：

* 分析 RWA Token 的投資價值
* 蒐集市場與專案相關資訊
* 評估投資風險
* 根據投資人的風險偏好制定策略
* 自動執行 RWA Token 的買入、持有與賣出
* 持續監控市場與專案狀態

最終希望建立一個：

> **「募資者可以快速取得資金、一般投資人可以低門檻參與、AI Agent 可以自動管理投資」的 RWA 生態系。**

---

# 2. 我們想解決什麼問題？

## 2.1 傳統募資的問題

許多具有潛力的專案並不是沒有價值，而是缺乏取得資金的管道。

例如：

* 小農需要資金進行農地轉型
* 新創公司想研究新的半導體技術
* 商家想購買設備擴大營運
* 創作者需要資金製作新產品
* 新創公司有新的商業提案，但尚未產生穩定營收

這些專案可能具有實際資產或未來收益，但傳統金融市場往往需要較高的門檻與成本才能進入。

---

## 2.2 一般投資人的問題

另一方面，一般投資人即使有資金，也可能面臨：

* 不知道哪些專案值得投資
* 缺乏金融與產業分析能力
* 沒時間持續追蹤投資標的
* 不知道什麼時候應該買入或賣出
* 難以理解複雜的金融產品
* 投資決策容易受到情緒影響

因此，我們希望讓 AI Agent 成為使用者的「**個人基金經理人**」。

---

# 3. 為什麼是 RWA？

RWA（Real World Assets）可以將現實世界中的資產或價值，以 Token 的形式映射至區塊鏈。

例如：

```text
實體資產 / 專案價值
        ↓
   價值評估與驗證
        ↓
      RWA Token
        ↓
      Blockchain
        ↓
     投資人交易
```

### RWA 的核心價值

### ① 資產可以被 Token 化

例如：

> 一台具有市場價值的設備
> → 對應 RWA Token

或：

> 一個新創專案的可驗證資產
> → 對應 RWA Token

RWA Token 所代表的不是單純的虛擬貨幣，而是與現實世界的資產、債權、收益或其他可驗證價值產生關聯。

---

### ② 降低投資參與門檻

大型資產或金融商品過去往往需要大量資金才能參與。

透過 Tokenization，可以將一個較大的資產拆分成較小的投資單位。

例如：

```text
原始資產
價值 1,000 萬元
        ↓
Tokenization
        ↓
100,000 個 RWA Token
        ↓
每個 Token 對應一部分價值
```

因此，原本只有大型機構可能參與的資產，有機會讓更多投資人參與。

---

### ③ 區塊鏈提供可程式化的交易機制

RWA Token 可以透過智能合約建立：

* 發行
* 持有
* 轉移
* 抵押
* 贖回
* 資金分配
* 自動交易

等機制。

這也是我們將 **AI Agent + Smart Contract** 結合的原因。

---

# 4. 核心概念：RWA 募資平台

我們的平台不只是一個「RWA 交易所」。

我們希望建立的是一個：

> **RWA-based Crowdfunding Platform**

讓不同類型的創意與專案，都有機會轉化為可以被投資的 RWA Asset。

---

## 4.1 使用情境

例如，一間新創公司想研究半導體技術。

公司需要購買一台昂貴的設備，但目前沒有足夠資金。

傳統模式：

```text
新創公司
   ↓
尋找大型投資人
   ↓
募資
   ↓
購買設備
```

我們的平台：

```text
新創公司
   ↓
提出專案
   ↓
資產與價值評估
   ↓
建立 RWA Token
   ↓
公開募資
   ↓
投資人購買 Token
   ↓
智能合約管理資金
```

即使最後專案沒有成功，Token 背後仍可能存在具有市場價值的實體資產。

例如設備可以出售，因此 RWA Token 並非單純建立在「成功預期」之上，而是可以進一步建立在可驗證的資產價值之上。

---

# 5. AI Agent：個人基金經理人

本專案最核心的 AI 功能，是建立一個能夠自主執行投資流程的 **AI Agent**。

AI Agent 不只是聊天機器人，而是能夠：

> **感知 → 分析 → 制定策略 → 執行 → 監控 → 再決策**

的 Agent。

---

## 5.1 AI Agent 工作流程

```text
                 使用者
                    │
                    ▼
             設定投資偏好
                    │
                    ▼
             ┌──────────────┐
             │   AI Agent   │
             │              │
             │ 資訊蒐集     │
             │ 風險分析     │
             │ 投資評估     │
             │ 策略制定     │
             └──────┬───────┘
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
      買入 RWA             賣出 RWA
          │                   │
          └─────────┬─────────┘
                    ▼
              Smart Contract
                    │
                    ▼
                 Wallet
```

---

# 6. AI Agent 可以做什麼？

## 6.1 RWA 投資分析

AI Agent 蒐集與分析：

* 專案基本資料
* 資產價值
* 公司資訊
* 市場狀況
* 產業資訊
* 新聞
* 公司管理層變動
* 財務資料
* Token 市場價格
* 交易量
* 其他外部情資

最後產生投資分析。

---

## 6.2 個人風險偏好

使用者可以設定自己的投資風格。

例如：

```text
Risk Level
──────────────
保守   ███░░░░░░░
平衡   █████░░░░░
積極   ████████░░
```

也可以讓使用者透過自然語言設定：

> 「我希望報酬率高一點，但不要承擔太大的本金損失。」

AI Agent 將使用者需求轉換成投資策略。

---

## 6.3 自動交易

當 AI Agent 判斷某個 RWA Token 符合使用者策略時：

```text
AI 分析
 ↓
符合投資條件
 ↓
產生交易策略
 ↓
Smart Contract
 ↓
Wallet
 ↓
執行交易
```

使用者不需要每一次都手動操作。

---

# 7. AI Agent 情境範例

假設使用者持有：

> 「半導體設備 RWA Token」

AI Agent 持續監控相關資訊。

某一天，Agent 發現：

```text
① 公司 CEO 更換
② 半導體研究計畫延期
③ 新聞出現負面消息
④ 設備估值下降
⑤ Token 市場價格快速下跌
```

AI Agent 綜合分析後判斷：

> 該專案未來風險提高，已超過使用者設定的風險承受範圍。

因此：

```text
Risk Score ↑
      ↓
觸發 Sell Strategy
      ↓
Smart Contract
      ↓
自動賣出
```

這就是我們所謂的：

> **AI Agent Fund Manager**

---

# 8. Smart Contract

智能合約負責處理 RWA Token 與資金的核心邏輯。

初期 Demo 可以先部署在 **Private Chain / Demo Chain**。

---

## 8.1 核心功能

### Token Management

* RWA Token 發行
* Token 持有
* Token 轉移
* Token 贖回

### Investment

* 投資人投入資金
* 資金池管理
* 投資額分配

### Automated Distribution

例如：

```text
Funding Pool
     │
     ▼
Smart Contract
     │
     ├── Investor A → USDC
     ├── Investor B → USDC
     └── Investor C → USDC
```

智能合約可以根據 RWA Token 的持有比例或指定條件，自動進行資金分配。

---

# 9. Wallet Integration

使用者透過 Wallet 與平台互動。

```text
User
 │
 ▼
Web Frontend
 │
 ▼
AI Agent
 │
 ▼
Smart Contract
 │
 ▼
Wallet
 │
 ▼
Blockchain
```

Wallet 可以作為使用者：

* 身分
* 資產持有工具
* 交易工具

並透過智能合約完成交易。

---

# 10. MCP × AI Agent

為了讓 AI Agent 能夠實際操作區塊鏈與錢包，我們預計將 AI Agent 與 MCP / Tool Calling 機制整合。

例如 Agent 可以使用：

```text
get_rwa_assets()
get_market_data()
get_wallet_balance()
get_risk_score()
buy_rwa()
sell_rwa()
```

讓 LLM 不只是「回答投資建議」，而是能夠真正執行可控的金融操作。

---

# 11. 使用者流程

## Step 1 — 連接 Wallet

使用者進入平台並連接自己的 Wallet。

---

## Step 2 — 設定投資偏好

例如：

```text
投資金額：10,000 USDC

風險偏好：中度

希望投資：
☑ 農業
☑ 新創
☑ 科技

單一資產最大配置：30%

最大可接受損失：10%
```

---

## Step 3 — AI Agent 分析 RWA

Agent 蒐集：

* 資產資料
* 市場資料
* 專案資訊
* 外部新聞
* 風險因素

並產生：

```text
Investment Score
Risk Score
Expected Return
Recommended Allocation
```

---

## Step 4 — Agent 制定投資策略

例如：

```text
RWA A
Allocation: 20%
Risk: Low

RWA B
Allocation: 30%
Risk: Medium

RWA C
Allocation: 10%
Risk: High
```

---

## Step 5 — 執行交易

使用者確認策略後，Agent 呼叫智能合約執行交易。

---

## Step 6 — 持續監控

Agent 持續監控：

```text
Market
Company
Asset
News
Token Price
Risk
```

如果風險條件改變，重新評估是否：

* Buy
* Hold
* Sell

---

# 12. 平台對不同角色的價值

## 投資人

### 傳統投資

```text
自己找資料
 ↓
自己分析
 ↓
自己決定
 ↓
自己盯盤
 ↓
自己交易
```

### 我們的平台

```text
設定投資目標
 ↓
AI Agent 分析
 ↓
AI Agent 制定策略
 ↓
自動執行
 ↓
持續監控
```

降低一般使用者參與複雜投資商品的操作門檻。

---

## 募資者

可以透過平台：

* 發起專案
* 將資產 Tokenization
* 接觸更多投資人
* 取得資金
* 透過智能合約管理資金

讓「有創意但缺乏資源」的專案獲得新的募資管道。

---

## 國泰金控

平台可以為金融機構創造：

### ① RWA 發行與管理服務

金融機構可以成為：

* RWA 發行平台
* 資產管理者
* 金融服務提供者

### ② 交易與服務收入

未來可透過：

* Token 發行費
* 交易手續費
* 資產管理費
* AI Agent 服務費

建立商業模式。

### ③ 金融機構的信任角色

RWA 市場最大的問題之一是：

> **「鏈上的 Token，背後的資產到底是不是真的？」**

金融機構可以提供：

* KYC
* 資產驗證
* 風險管理
* 託管
* 合規
* 信用背書

因此，金融機構不是單純「發幣」，而是成為 RWA 生態系中的 **Trusted Financial Infrastructure**。

---

# 13. 為什麼需要 AI Agent？

如果只有 RWA：

```text
Asset
 ↓
Token
 ↓
Blockchain
 ↓
Investor
```

使用者仍然需要自己：

* 找資料
* 分析
* 決定買什麼
* 決定什麼時候賣
* 管理投資組合

加入 AI Agent：

```text
Asset
 ↓
RWA Token
 ↓
Blockchain
 ↓
AI Agent
 ↓
Automated Investment
```

因此：

> **RWA 解決「資產如何上鏈與被投資」；
> AI Agent 解決「投資人如何理解、管理與交易這些資產」。**

兩者形成互補。

---

# 14. 安全性設計

金融 Agent 最大的問題不是「能不能交易」，而是：

> **AI 能不能被允許無限制地交易？**

因此我們會將 AI Agent 與資金權限分離。

例如：

```text
AI Agent
   │
   ├── Read Permission
   │     ├── Market Data
   │     ├── RWA Data
   │     └── Risk Data
   │
   └── Trade Permission
         │
         ├── Daily Limit
         ├── Single Transaction Limit
         ├── Asset Whitelist
         └── Risk Threshold
```

AI Agent 不應該擁有無限制的資金權限。

---

## 安全機制

預計加入：

* 單筆交易上限
* 每日交易上限
* Token Whitelist
* 最大持倉比例
* 最大可接受損失
* 使用者人工確認
* Smart Contract Permission
* Wallet Permission
* Emergency Stop

讓 Agent 在「**可控範圍內自動化**」。

---

# 15. 中心化金融機構角色

我們並不認為所有金融功能都必須完全去中心化。

相反地，可以採取：

> **Blockchain + AI + Trusted Financial Institution**

的混合模式。

例如：

```text
             國泰金控
                │
       ┌────────┼────────┐
       ▼        ▼        ▼
      KYC      RWA      Risk
              Verify    Control
       │        │        │
       └────────┼────────┘
                ▼
            Blockchain
                │
          Smart Contract
                │
                ▼
            AI Agent
                │
                ▼
             Investor
```

這能夠同時兼顧：

* Blockchain 的透明性
* AI 的自動化
* 金融機構的信任與合規能力

---

# 16. 商業模式

平台未來可以從以下方向獲利：

| 收入來源        | 說明                    |
| ----------- | --------------------- |
| RWA 發行費     | 專案建立 RWA Token 的服務費   |
| 交易手續費       | RWA Token 買賣抽成        |
| AI Agent 訂閱 | 個人基金經理人服務             |
| 資產管理費       | AI 投資組合管理             |
| 金融服務        | KYC、託管、驗證等            |
| B2B API     | 提供企業 RWA / Agent 基礎設施 |

---

# 17. MVP Demo 範圍

本次 Hackathon 不需要完成完整金融市場。

我們將聚焦在一個可以展示核心概念的 MVP。

## MVP Architecture

```text
                 ┌─────────────┐
                 │   Frontend  │
                 └──────┬──────┘
                        │
                        ▼
                 ┌─────────────┐
                 │  AI Agent   │
                 └──────┬──────┘
                        │
              ┌─────────┼─────────┐
              ▼         ▼         ▼
          RWA Data   Risk Data  Market Data
              │         │         │
              └─────────┼─────────┘
                        ▼
                 ┌─────────────┐
                 │Smart Contract│
                 └──────┬──────┘
                        │
                        ▼
                    Wallet
                        │
                        ▼
                   Demo Chain
```

---

# 18. MVP 功能

### Frontend

* Wallet Connect
* RWA Token 列表
* RWA 詳細資訊
* AI 投資分析
* Risk Score
* Portfolio
* Buy / Sell
* Agent Status

### AI Agent

* RWA 資訊分析
* 投資風險評估
* 投資組合配置
* Buy / Hold / Sell 判斷
* 自然語言投資策略
* 外部資訊監控

### Smart Contract

* RWA Token
* Wallet
* Funding Pool
* USDC 模擬資產
* Token Transfer
* Automated Distribution
* Buy / Sell Demo

---

# 19. Demo 情境

我們的 2–3 分鐘 Demo 可以採用以下故事：

### Scene 1 — 新創募資

一間半導體新創公司需要購買研究設備。

```text
Funding Target
$1,000,000 USDC
```

平台將其資產與專案價值 Tokenization。

---

### Scene 2 — 投資人進場

使用者連接 Wallet。

輸入：

> 「我有 10,000 USDC，希望中度風險投資科技類 RWA。」

AI Agent 開始分析。

---

### Scene 3 — AI Agent 投資

Agent 分析多個 RWA：

```text
RWA A
Risk: Low
Score: 82

RWA B
Risk: Medium
Score: 76

RWA C
Risk: High
Score: 48
```

Agent 自動配置資金。

---

### Scene 4 — 市場變化

Agent 發現：

> 半導體專案出現重大負面消息。

重新計算 Risk Score。

```text
Risk Score
45 → 78
```

超過使用者設定的風險門檻。

---

### Scene 5 — 自動賣出

Agent 觸發：

```text
SELL RWA B
```

Smart Contract 執行交易。

投資組合自動重新配置。

---

# 20. 技術 Stack

初期 Demo 預計使用：

### Frontend

* React / Next.js
* Web3 Wallet Integration

### AI

* LLM
* AI Agent
* MCP / Tool Calling
* External Information Retrieval

### Blockchain

* EVM-compatible Demo / Private Chain
* Solidity
* Smart Contract

### Assets

* RWA Token
* USDC Mock Token

### Backend

* Node.js / Python
* Agent API
* Market / RWA Data API

---

# 21. 專案目前分工

| 成員     | 負責項目                             |
| ------ | -------------------------------- |
| LT     | 使用者需求、提案、方向                      |
| Gimi   | RWA 應用、競品、募資情境                   |
| Sean   | Smart Contract、Private Chain     |
| Ying   | RWA、使用者情境                        |
| Amelie | AI Agent、Smart Contract、Frontend |
| Alex   | 技術方向、資金經理人 Agent、數據與安全性          |
| 全員     | 商業模式、Demo、簡報                     |

---

# 22. 目前研究方向

接下來需要補強：

### RWA 市場數據

需要尋找：

* RWA 市場規模
* Tokenization 案例
* 傳統資產交易成本
* 傳統金融交易速度
* Blockchain 跨境轉帳速度
* RWA 投資門檻
* 個人投資者參與案例

### 競品

研究：

* 銀行 RWA 服務
* 金融機構 Tokenization
* RWA Marketplace
* Blockchain Crowdfunding
* AI Investment Agent

### 安全性

研究：

* AI Agent Wallet Security
* Smart Contract Security
* Agent Permission
* Transaction Limit
* Custody
* KYC / AML
* RWA Asset Verification

---

# 23. 競賽定位

本專案對應：

> **國泰金控 Track 01：AI Agent × 區塊鏈企業創新**

核心關鍵字：

```text
AI Agent
RWA
Blockchain
Smart Contract
Wallet
Automated Investment
Tokenization
Crowdfunding
Risk Management
Financial Institution
```

---

# 24. 核心價值主張

我們希望用一句話說清楚這個專案：

> **「讓任何有價值的創意都能被資產化，讓任何投資人都能擁有自己的 AI 基金經理人。」**

或者更偏向金融機構的版本：

> **「以 RWA 打開資產投資入口，以 AI Agent 自動化投資決策，透過金融機構建立可信任的鏈上金融基礎設施。」**

---

# 25. Roadmap

### Phase 1 — Hackathon MVP

* [x] RWA 概念設計
* [ ] RWA Token Demo
* [ ] Smart Contract
* [ ] Demo Chain
* [ ] Wallet
* [ ] AI Agent
* [ ] Risk Score
* [ ] Buy / Sell
* [ ] Frontend
* [ ] Demo Video

### Phase 2 — Prototype

* [ ] 真實 RWA Data
* [ ] 外部資訊 Agent
* [ ] Portfolio Management
* [ ] Advanced Risk Model
* [ ] Permission System
* [ ] Transaction Monitoring

### Phase 3 — Financial Platform

* [ ] RWA Issuance
* [ ] KYC / AML
* [ ] Asset Verification
* [ ] Custody
* [ ] Institutional Integration
* [ ] Compliance
* [ ] Real-world Financial Products

---

# 26. Disclaimer

本專案目前為 Hackathon / Proof of Concept。

Demo 中使用的 RWA Token、USDC、資產價格及交易皆為測試或模擬用途，不代表實際投資商品，也不構成任何投資建議。

實際上線仍需要進一步處理：

* 金融法規
* 證券法規
* KYC / AML
* 資產託管
* RWA 資產驗證
* 智能合約安全
* AI 決策風險
* 使用者資產安全

---

# 27. References

* RWA Hackathon Taiwan
  https://hackathon.com.tw/winners

* Hackathon Track
  https://hackathon.com.tw/tracks/w4VERnRA0NQD3MiJfWnt

* Smart Contract Demo
  https://github.com/alex124513/contractTest

* RWA / Blockchain Reference
  https://github.com/hugebing/blygccrryryy

---

## TL;DR

**RWA** 負責把現實世界的資產與專案價值帶到區塊鏈。

**Smart Contract** 負責資產、資金與交易規則。

**AI Agent** 則成為投資人的「基金經理人」，負責分析資訊、評估風險、管理投資組合，並在使用者授權的範圍內自動執行交易。

最終形成：

```text
        Real World Assets
                │
                ▼
          RWA Tokenization
                │
                ▼
           Blockchain
                │
                ▼
        ┌───────────────┐
        │   AI Agent    │
        │               │
        │ Analyze       │
        │ Decide        │
        │ Monitor       │
        │ Execute       │
        └───────┬───────┘
                │
                ▼
             Wallet
                │
                ▼
            Investor
```

> **Tokenize the value.
> Automate the investment.
> Make finance more accessible.**
