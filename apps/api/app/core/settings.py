from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    app_name: str = "MegaMarket API"
    app_version: str = "0.1.0"
    debug: bool = False
    environment: str = "development"  # development | staging | production

    # Supabase — se configurará en Fase 1
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""


settings = Settings()
