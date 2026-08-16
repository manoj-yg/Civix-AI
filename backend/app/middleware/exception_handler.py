import logging
from fastapi import Request, status
from fastapi.responses import JSONResponse
from app.core.exceptions import AppException

logger = logging.getLogger("civix_backend")

async def app_exception_handler(request: Request, exc: AppException):
    correlation_id = getattr(request.state, "correlation_id", "N/A")
    logger.warning(f"[{correlation_id}] AppException: {exc.code} - {exc.message}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details
            },
            "request_id": correlation_id
        }
    )

async def generic_exception_handler(request: Request, exc: Exception):
    correlation_id = getattr(request.state, "correlation_id", "N/A")
    logger.error(f"[{correlation_id}] Unhandled Exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred. Please try again later.",
                "details": {}
            },
            "request_id": correlation_id
        }
    )
