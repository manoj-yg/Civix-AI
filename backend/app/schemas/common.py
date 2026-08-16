from typing import Generic, TypeVar, Optional, Dict, Any
from pydantic import BaseModel, Field

DataT = TypeVar("DataT")

class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Optional[Dict[str, Any]] = None

class StandardResponse(BaseModel, Generic[DataT]):
    success: bool = True
    data: Optional[DataT] = None
    error: Optional[ErrorDetail] = None
    request_id: Optional[str] = None
