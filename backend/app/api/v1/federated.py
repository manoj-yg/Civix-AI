from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Body, Query
from pydantic import BaseModel, Field

from app.schemas.common import StandardResponse
from app.api.v1.auth import get_current_user
from app.core.exceptions import ForbiddenException
from app.models.models import User, RoleEnum
from app.federated.server.flower_server import get_flower_server_manager, FlowerServerManager
from app.federated.clients.client_manager import get_client_registry, MunicipalClientRegistry

router = APIRouter(prefix="/federated", tags=["Federated Learning (Flower Framework)"])

def require_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != RoleEnum.ADMIN:
        raise ForbiddenException("Admin authorization required for Federated Learning operations")
    return current_user

class StartRoundPayload(BaseModel):
    num_rounds: Optional[int] = Field(default=1, ge=1, le=50)

@router.post("/rounds/start", response_model=StandardResponse[Dict[str, Any]])
def start_federated_round(
    payload: StartRoundPayload = Body(...),
    admin_user: User = Depends(require_admin_user),
    fl_server: FlowerServerManager = Depends(get_flower_server_manager)
):
    """
    Triggers execution of one or more Federated Learning rounds across registered municipal nodes.
    Requires ADMIN privileges.
    """
    result = fl_server.start_training_round(num_rounds=payload.num_rounds)
    return StandardResponse(data=result)

@router.get("/status", response_model=StandardResponse[Dict[str, Any]])
def get_federated_status(
    admin_user: User = Depends(require_admin_user),
    fl_server: FlowerServerManager = Depends(get_flower_server_manager)
):
    """
    Returns current Federated Learning server status, round history, and participation parameters.
    Requires ADMIN privileges.
    """
    status_info = fl_server.get_server_status()
    return StandardResponse(data=status_info)

@router.get("/model", response_model=StandardResponse[Dict[str, Any]])
def get_global_model_metadata(
    admin_user: User = Depends(require_admin_user),
    fl_server: FlowerServerManager = Depends(get_flower_server_manager)
):
    """
    Returns metadata and metric parameters for the aggregated global model.
    Requires ADMIN privileges.
    """
    model_meta = fl_server.get_global_model_metadata()
    return StandardResponse(data=model_meta)

@router.get("/metrics", response_model=StandardResponse[List[Dict[str, Any]]])
def get_federated_metrics(
    admin_user: User = Depends(require_admin_user),
    fl_server: FlowerServerManager = Depends(get_flower_server_manager)
):
    """
    Returns round-by-round global loss, accuracy, and client metrics history.
    Requires ADMIN privileges.
    """
    history = fl_server.get_metrics_history()
    return StandardResponse(data=history)

@router.get("/clients", response_model=StandardResponse[List[Dict[str, Any]]])
def list_federated_clients(
    admin_user: User = Depends(require_admin_user),
    client_registry: MunicipalClientRegistry = Depends(get_client_registry)
):
    """
    Lists registered municipal client nodes and privacy parameters.
    Requires ADMIN privileges.
    """
    clients_list = client_registry.list_clients()
    return StandardResponse(data=clients_list)
