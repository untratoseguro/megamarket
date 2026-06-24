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

    # PayPal — usa sandbox.paypal.com para dev, api-m.paypal.com para prod
    paypal_client_id: str = ""
    paypal_client_secret: str = ""
    paypal_webhook_id: str = ""  # ID del webhook registrado en el dashboard de PayPal
    paypal_base_url: str = "https://api-m.sandbox.paypal.com"

    # Wompi (Colombia, COP). El monto USD se convierte usando la tasa configurada.
    wompi_private_key: str = ""
    wompi_event_secret: str = ""  # "Llave de eventos" en el dashboard de Wompi
    wompi_base_url: str = "https://sandbox.wompi.co/v1"
    # Tipo de cambio aproximado COP/USD para convertir totales de la orden
    wompi_cop_per_usd: float = 4100.0

    # Anthropic — Claude API
    anthropic_api_key: str = ""
    # Modelo a usar para el asistente conversacional
    anthropic_model: str = "claude-sonnet-4-6"

    # URL base del frontend (para return_url / redirect_url de pagos)
    frontend_url: str = "http://localhost:3000"

    def get_cors_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
