from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    # Ollama settings
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.1"
    
    # Database settings
    DATABASE_URL: str = "postgresql+asyncpg://user:pass@localhost/biscraper"
    
    # Redis settings
    REDIS_URL: str = "redis://localhost:6379"
    
    # Google Custom Search API settings
    GOOGLE_CSE_API_KEY: Optional[str] = None
    GOOGLE_CSE_ID: Optional[str] = None
    
    # Crawler settings
    MAX_CONCURRENT_CRAWLS: int = 5
    RATE_LIMIT_PER_DOMAIN: int = 2
    
    # Proxy settings
    USE_TOR_PROXY: bool = False
    FREE_PROXY_ENABLED: bool = True

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()
