from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "French Tender Automator"
    environment: str = "production"

    # Database & Redis
    database_url: str = "postgresql+psycopg://tender_user:change_me_strong_db_password@db:5432/french_tenders"
    redis_url: str = "redis://redis:6379/0"

    # LLM & Embeddings
    llm_provider: str = "openai"  # openai | gemini | heuristic
    llm_model: str = "gpt-4o-mini"
    gemini_model: str = "gemini-3.8-flash"
    embedding_model: str = "text-embedding-3-small"
    gemini_embedding_model: str = "gemini-embedding-001"
    embedding_dim: int = 1536
    openai_api_key: str = ""
    gemini_api_key: str = ""

    # Authentication
    app_basic_auth_user: str = "admin"
    app_basic_auth_pass: str = "change_me_strong_app_password"
    jwt_secret_key: str = "change_me_to_a_random_64_char_secret_key_for_jwt_signing"
    jwt_expire_minutes: int = 720

    # BOAMP Polling
    boamp_api_url: str = "https://boamp-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/boamp/records"
    boamp_cron_hour: int = 7
    boamp_cron_minute: int = 0
    boamp_default_limit: int = 25

    # Default Company Profile Seed
    default_company_name: str = "Mon Entreprise SAS"
    default_departments: str = "75,91,92"
    default_cpv_codes: str = "72000000,45000000"
    default_keywords: str = "cloud,infogérance,développement,cybersécurité"

    # Persistent Data Storage
    data_dir: Path = Path("/app/data")

    @property
    def kb_dir(self) -> Path:
        path = self.data_dir / "knowledge_base"
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def dce_dir(self) -> Path:
        path = self.data_dir / "dce_uploads"
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def export_dir(self) -> Path:
        path = self.data_dir / "exports"
        path.mkdir(parents=True, exist_ok=True)
        return path


@lru_cache
def get_settings() -> Settings:
    return Settings()
