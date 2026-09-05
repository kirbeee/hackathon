from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    openai_api_key: str
    openai_model: str = "gpt-4o-mini"
    fundraising_api_url: str = "http://127.0.0.1:8000"
    solana_rpc_url: str = "https://api.devnet.solana.com"


settings = Settings()
