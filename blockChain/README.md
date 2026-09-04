# Quick note
## Setting up
1. sudo apt-get update

1.1 `cd hackathon`

2. install solana  
`curl --proto '=https' --tlsv1.2 -sSfL https://solana-install.solana.workers.dev | bash`

run  validator  
3. `solana-test-validator`

## 動作：
### 發幣
`solana airdrop 100 <pub_key> --url localhost`

### 查看錢包餘額
`solana balance`

### 查看鏈路
`solana config get`

### create wallet
`solana-keygen new -o /Users/sean_lin/.config/solana/id.json`
