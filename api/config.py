from pathlib import Path

from pydantic import AliasChoices
from pydantic_settings import BaseSettings
from pydantic import Field

ENV_FILE = Path(__file__).resolve().parent.parent / ".env.local"


class Settings(BaseSettings):
    github_app_client_id: str = Field(
        validation_alias=AliasChoices("github_app_client_id", "github_client_id"),
    )
    github_app_client_secret: str = Field(
        validation_alias=AliasChoices("github_app_client_secret", "github_client_secret"),
    )
    github_webhook_secret: str = Field(
        validation_alias=AliasChoices("github_webhook_secret"),
    )
    github_app_private_key: str = Field(
        validation_alias=AliasChoices("github_app_private_key", "github_private_key"),
    )
    frontend_url: str
    database_url: str
    session_secret: str

    model_config = {"env_file": str(ENV_FILE), "extra": "ignore"}


settings = Settings()
