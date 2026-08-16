import sys
from pathlib import Path
from typing import List, Optional, Union
from pydantic import AnyHttpUrl
try:
    from pydantic_settings import BaseSettings
except ImportError:
    from pydantic import BaseSettings

ROOT_DIR = Path(__file__).resolve().parent.parent.parent.parent
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent

if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


class Settings(BaseSettings):
    PROJECT_NAME: str = "CIVIX AI Infrastructure Intelligence Platform"
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Security & Auth
    JWT_SECRET: str = "civix_ai_super_secret_jwt_key_2026_change_in_prod"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days

    # PostgreSQL + PostGIS Database
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: str = "5432"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "civix_ai_db"
    DATABASE_URL: Optional[str] = None

    # Redis Cache & Worker
    REDIS_URL: str = "redis://localhost:6379/0"

    # Storage
    STORAGE_TYPE: str = "local" # "local" or "s3"
    STORAGE_DIR: str = str(ROOT_DIR / "temp" / "uploads")
    S3_BUCKET_NAME: Optional[str] = None
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: str = "us-east-1"

    # Legacy Configuration support
    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SENDER_EMAIL: str = ""
    SENDER_PASSWORD: str = ""
    RECIPIENT_EMAIL: str = ""
    ENABLE_EMAIL: bool = False
    MONGO_URI: str = ""
    ENABLE_MONGO: bool = False

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["*"]

    # AI Models & Infrastructure Settings
    MODEL_VERSION: str = "yolov8" # "yolov8" or "v2" / "upgraded" for rollback control
    MODELS_DIR: str = str(ROOT_DIR / "models")
    YOLO_DEFAULT_MODEL_PATH: str = str(ROOT_DIR / "models" / "YOLOv8_Small_RDD.pt")
    YOLO_UPGRADED_MODEL_PATH: Optional[str] = None
    UNET_MODEL_PATH: Optional[str] = None
    XGBOOST_MODEL_PATH: Optional[str] = None
    LSTM_MODEL_PATH: Optional[str] = None

    # Rate Limiting & Upload Security
    RATE_LIMIT_PER_MINUTE: int = 120
    MAX_FILE_SIZE_BYTES: int = 50 * 1024 * 1024 # 50 MB max upload

    # LLM & Recommendation Settings
    LLM_PROVIDER: str = "mock" # "mock", "openai", "anthropic", "local"
    LLM_API_KEY: Optional[str] = None
    LLM_MODEL_NAME: str = "gpt-4o"

    # Federated Learning (Flower) Settings
    FL_SERVER_ADDRESS: str = "127.0.0.1:8080"
    FL_MIN_CLIENTS: int = 2
    FL_NUM_ROUNDS: int = 3
    FL_LOCAL_EPOCHS: int = 2
    FL_BATCH_SIZE: int = 16
    FL_LEARNING_RATE: float = 0.001

    # Blockchain Audit Settings
    BLOCKCHAIN_ENABLED: bool = True
    BLOCKCHAIN_PROVIDER: str = "mock" # "mock" or "web3"
    BLOCKCHAIN_RPC_URL: str = "http://127.0.0.1:8545"
    BLOCKCHAIN_CHAIN_ID: int = 1337
    BLOCKCHAIN_CONTRACT_ADDRESS: str = "0x0000000000000000000000000000000000000000"
    BLOCKCHAIN_PRIVATE_KEY: Optional[str] = None

    class Config:
        case_sensitive = True
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

    def get_database_url(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

settings = Settings()
