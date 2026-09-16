from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "BookVerse"
    app_env: str = "development"
    secret_key: str = "change-me-in-production"
    # SQLite for local development; set DATABASE_URL to postgresql+asyncpg://... in production.
    database_url: str = "sqlite+aiosqlite:///./bookverse.db"
    frontend_url: str = "http://localhost:5173"
    cors_origins: str = "http://localhost:5173,http://localhost:4173"
    public_api_url: str = "http://localhost:8000"

    access_token_minutes: int = 60
    refresh_token_days: int = 30

    google_client_id: str = ""
    gutendex_base_url: str = "https://gutendex.com"
    gutenberg_base_url: str = "https://www.gutenberg.org"

    uploads_dir: str = "uploads"
    # Set S3_BUCKET to store uploads in S3 (recommended on AWS). S3_PUBLIC_URL = CloudFront domain in front of the bucket.
    s3_bucket: str = ""
    s3_public_url: str = ""
    aws_region: str = ""
    max_upload_mb: int = 8

    # Email: leave smtp_host empty to log emails to the console instead of sending.
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    mail_from: str = "BookVerse <hello@bookverse.app>"

    seed_on_start: bool = True
    # Comma-separated emails that are promoted to admin whenever they log in.
    admin_emails: str = ""


settings = Settings()
