from typing import Any, Dict, Optional, List

class AppException(Exception):
    def __init__(
        self,
        message: str,
        code: str = "INTERNAL_SERVER_ERROR",
        status_code: int = 500,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(message)

class NotFoundException(AppException):
    def __init__(self, resource: str = "Resource", identifier: Any = None):
        msg = f"{resource} with identifier '{identifier}' not found" if identifier else f"{resource} not found"
        super().__init__(message=msg, code="NOT_FOUND", status_code=404)

class UnauthorizedException(AppException):
    def __init__(self, message: str = "Authentication credentials were missing or invalid"):
        super().__init__(message=message, code="UNAUTHORIZED", status_code=401)

class ForbiddenException(AppException):
    def __init__(self, message: str = "Permission denied for the requested action"):
        super().__init__(message=message, code="FORBIDDEN", status_code=403)

class ValidationException(AppException):
    def __init__(self, message: str = "Input validation failed", details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, code="VALIDATION_ERROR", status_code=422, details=details)
