import time
from typing import Dict, Tuple
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from app.core.config import settings

class RateLimiterMiddleware(BaseHTTPMiddleware):
    """
    Rate Limiter Middleware using IP token bucket window.
    Enforces maximum request limits per minute per IP address.
    """
    def __init__(self, app, requests_per_minute: int = settings.RATE_LIMIT_PER_MINUTE):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.client_requests: Dict[str, Tuple[int, float]] = {}

    async def dispatch(self, request: Request, call_next):
        # Exclude static files and health checks from rate limiting
        if request.url.path.startswith("/health") or request.url.path.startswith("/docs") or request.url.path.startswith("/redoc"):
            return await call_next(request)

        client_ip = request.client.host if request.client else "127.0.0.1"
        now = time.time()

        count, first_request_time = self.client_requests.get(client_ip, (0, now))

        if now - first_request_time > 60:
            # Reset window
            self.client_requests[client_ip] = (1, now)
        else:
            if count >= self.requests_per_minute:
                return JSONResponse(
                    status_code=429,
                    content={
                        "success": False,
                        "error": {
                            "code": "TOO_MANY_REQUESTS",
                            "message": "Rate limit exceeded. Please wait a minute before retrying."
                        }
                    }
                )
            self.client_requests[client_ip] = (count + 1, first_request_time)

        return await call_next(request)
