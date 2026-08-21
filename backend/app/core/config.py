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
    MODEL_VERSION: str = "auto" # "auto", "yolov26", "yolov11", "yolov8", "v2"
    MODELS_DIR: str = str(ROOT_DIR / "models")
    YOLO_V26_MODEL_PATH: str = str(ROOT_DIR / "models" / "yolo26_model.pt")
    YOLO_V11_MODEL_PATH: str = str(ROOT_DIR / "models" / "yolov11_model.pt")
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

    def get_active_yolo_model_path(self) -> Path:
        """
        Dynamically resolves the active YOLO model path based on MODEL_VERSION and existing weights.
        Prioritizes:
          1. Explicit path in YOLO_UPGRADED_MODEL_PATH
          2. Version flag: 'yolo26' / 'yolov26' -> yolo26_model.pt
          3. Version flag: 'yolo11' / 'yolov11' -> yolov11_model.pt or 'yolov11 model.pt'
          4. Version flag: 'yolov8' -> YOLOv8_Small_RDD.pt
          5. 'auto' -> finds first existing in: yolo26_model.pt, yolov11_model.pt, best.pt, YOLOv8_Small_RDD.pt
        """
        models_dir = Path(self.MODELS_DIR)
        if self.YOLO_UPGRADED_MODEL_PATH and Path(self.YOLO_UPGRADED_MODEL_PATH).exists():
            return Path(self.YOLO_UPGRADED_MODEL_PATH)

        mv = (self.MODEL_VERSION or "").lower()
        if mv in ("yolov26", "yolo26"):
            p = models_dir / "yolo26_model.pt"
            if p.exists():
                return p
        elif mv in ("yolov11", "yolo11"):
            for name in ("yolov11_model.pt", "yolov11 model.pt"):
                p = models_dir / name
                if p.exists():
                    return p
        elif mv in ("yolov8", "rdd"):
            p = models_dir / "YOLOv8_Small_RDD.pt"
            if p.exists():
                return p

        # Auto detection search order
        candidates = [
            models_dir / "yolo26_model.pt",
            models_dir / "yolov11_model.pt",
            models_dir / "yolov11 model.pt",
            models_dir / "best.pt",
            models_dir / "YOLOv8_Small_RDD.pt"
        ]
        for c in candidates:
            if c.exists():
                return c
        return Path(self.YOLO_DEFAULT_MODEL_PATH)

    def get_active_yolo_model_name(self) -> str:
        p = self.get_active_yolo_model_path()
        stem = p.stem.lower()
        if "26" in stem:
            return "YOLOv26_Pothole_Detector"
        elif "11" in stem:
            return "YOLOv11_Pothole_Detector"
        elif "best" in stem:
            return "YOLO_Pothole_Detector_Best"
        elif "rdd" in stem or "v8" in stem:
            return "YOLOv8_Small_RDD"
        return f"YOLO_{p.stem}"

settings = Settings()

