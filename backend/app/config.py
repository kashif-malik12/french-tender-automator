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
    tradister_auth_hash: str = ""
    jwt_secret_key: str = "change_me_to_a_random_64_char_secret_key_for_jwt_signing"
    jwt_expire_minutes: int = 720

    # BOAMP & TED EU Polling
    boamp_api_url: str = "https://boamp-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/boamp/records"
    ted_api_url: str = "https://api.ted.europa.eu/v3/notices/search"
    boamp_cron_hour: int = 7
    boamp_cron_minute: int = 0
    boamp_default_limit: int = 30
    ted_default_limit: int = 25

    # Default Company Profile Seed (TRADISTER SASU)
    default_company_name: str = "TRADISTER SASU"
    default_company_president: str = "Bisma Kashif"
    default_company_siren: str = "988318945"
    default_company_siret: str = "98831894500017"
    default_company_tva: str = "FR42988318945"
    default_company_naf: str = "62.02A"
    default_company_address: str = "11 Rue du Château d'Eau, App 132, 91130 Ris-Orangis, France"
    default_departments: str = "91,94,77,92,75,78,93,95"
    default_cpv_codes: str = "72000000,72200000,72300000,72500000,72600000,48000000,30200000,50312000"
    default_keywords: str = "infogérance,cloud,Microsoft 365,M365,Entra,Intune,cybersécurité,support informatique,helpdesk,assistance utilisateur,poste de travail,postes de travail,déploiement informatique,maintenance informatique,TMA,MCO,ITSM,managed services,MAPA,sous-traitance"
    default_min_target_amount: int = 5000
    default_max_target_amount: int = 90000

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
