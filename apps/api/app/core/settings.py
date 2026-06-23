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

    # CORS — orígenes permitidos separados por coma.
    # Declarado como str porque pydantic-settings v2 intenta JSON-parsear list[str]
    # desde .env, rompiendo con valores como "http://localhost:3000".
    cors_origins: str = "http://localhost:3000"

    # Supabase
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    # JWT secret: Settings → API → JWT Settings en el dashboard de Supabase
    supabase_jwt_secret: str = ""

    def get_cors_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
