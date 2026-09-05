# Quick note

[//]: # (Depercate!!!)
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

## 學習如何發幣
`spl-token create-token --decimals 9`

Creating token CUZimkUatueVssxVSQG6aVP57YBBCs93atamJdsYrNzD under program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA
Address:  CUZimkUatueVssxVSQG6aVP57YBBCs93atamJdsYrNzD
Decimals:  9
Signature: xrntjYKepBhbro7YC64XxJhafYK1NtTxJneoLPWKyd8Kvuhyb9FNENTcoofKp854mUqrk1oNFMeuQagWRkDjH1T

`pl-token create-account CUZimkUatueVssxVSQG6aVP57YBBCs93atamJdsYrNzD`

Creating account 4GrYmxqyiPL9N4Wfpc9Wii7ZDLRbgZgoowHZ6jT7FUYB
Signature: qmBErF6eQn9cSAabYKuUcwPtUPHKft9xSkMK295Drz7WAtmQYnFkzdCSFrNuzkqKhYuDYEryawScLogLwQYeVuv

`spl-token mint CUZimkUatueVssxVSQG6aVP57YBBCs93atamJdsYrNzD 100000000`
Minting 100000000 tokens
  Token: CUZimkUatueVssxVSQG6aVP57YBBCs93atamJdsYrNzD
  Recipient: 4GrYmxqyiPL9N4Wfpc9Wii7ZDLRbgZgoowHZ6jT7FUYB
Signature: 2fJSi4VcD3dpuApTrGJLPBhPLLXk2E6fznXVUFaL7bpjZRxTgKZ2y7XJWYsaZtnCFEik2Z4cUBCZbKb5fFG79ZJu


