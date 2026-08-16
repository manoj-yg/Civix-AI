from pydantic import BaseModel
from app.core.config import settings

class FederatedConfig(BaseModel):
    server_address: str = settings.FL_SERVER_ADDRESS
    min_fit_clients: int = settings.FL_MIN_CLIENTS
    min_evaluate_clients: int = settings.FL_MIN_CLIENTS
    min_available_clients: int = settings.FL_MIN_CLIENTS
    num_rounds: int = settings.FL_NUM_ROUNDS
    local_epochs: int = settings.FL_LOCAL_EPOCHS
    batch_size: int = settings.FL_BATCH_SIZE
    learning_rate: float = settings.FL_LEARNING_RATE

def get_federated_config() -> FederatedConfig:
    return FederatedConfig()
