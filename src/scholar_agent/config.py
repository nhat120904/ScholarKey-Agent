"""Configuration settings for ScholarAgent."""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_name: str = "ScholarKey AI"
    app_version: str = "0.1.0"
    debug: bool = False

    # API Server
    api_host: str = "0.0.0.0"
    api_port: int = 8000

    # Claude AI (Anthropic)
    anthropic_api_key: str = Field(default="", description="Anthropic API key")
    claude_model: str = "claude-sonnet-4-20250514"

    # Tavily Search API
    tavily_api_key: str = Field(default="", description="Tavily API key for web search")

    # Hedera Configuration
    hedera_network: str = "testnet"
    hedera_account_id: str = Field(default="", description="Hedera account ID")
    hedera_private_key: str = Field(default="", description="Hedera private key")
    hedera_topic_id: str = Field(default="", description="HCS topic ID for verification")

    # Database (optional, for caching crawled data)
    database_url: str = "sqlite:///./scholar_agent.db"

    # File Upload
    max_upload_size_mb: int = 10
    allowed_file_types: list[str] = [".pdf", ".docx", ".doc"]

    @property
    def max_upload_size_bytes(self) -> int:
        """Get maximum upload size in bytes."""
        return self.max_upload_size_mb * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
