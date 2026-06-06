import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.endpoints import auth, leaves, ai_chat, complaints, documents, google_auth, users
from app.db.session import Base, engine

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.ai.orchestrator import startup, shutdown
import secrets
from fastapi import Request,Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

limiter = Limiter(key_func=get_remote_address)

Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(fastapi_app: FastAPI):
    """
    FastAPI lifespan context manager.
    Code before `yield` runs at startup; code after runs at shutdown.
    """
    await startup()          # opens PG pool + runs checkpointer migrations
    print("[App] ApexHR API ready.")
    yield                    # application runs here
    await shutdown()         # drains PG pool gracefully
    print("[App] ApexHR API shut down.")

app = FastAPI(
    title="HR AI System Backend",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter



def rate_limit_handler(request: Request, exc: Exception) -> Response:
    return _rate_limit_exceeded_handler(request, exc) # type: ignore

app.add_exception_handler(RateLimitExceeded, rate_limit_handler)

origins = []
frontend_url = os.getenv("FRONTEND_URL")



class ContentSizeLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method in ["POST", "PUT", "PATCH"]:
            content_length = request.headers.get("content-length")
            if content_length and int(content_length) > 5 * 1024 * 1024:
                return JSONResponse(
                    status_code=413,
                    content={"detail": "Payload Too Large. Maximum size is 5MB."}
                )
        return await call_next(request)

class CSRFMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if os.getenv("PYTEST_CURRENT_TEST"):
            return await call_next(request)
            
        csrf_cookie = request.cookies.get("csrf_token")
        
        if request.method in ["POST", "PUT", "DELETE", "PATCH"]:
            if request.url.path not in ["/auth/login", "/auth/login-form", "/auth/register"]:
                csrf_header = request.headers.get("x-csrf-token")
                if not csrf_cookie or csrf_header != csrf_cookie:
                    return JSONResponse(status_code=403, content={"detail": "CSRF token missing or incorrect."})
                
        response = await call_next(request)
        
        if not csrf_cookie:
            token = secrets.token_hex(32)
            response.set_cookie(
                key="csrf_token", 
                value=token, 
                httponly=False, 
                samesite="none", 
                secure=True
            )
            response.headers["X-CSRF-Token"] = token
        else:
            response.headers["X-CSRF-Token"] = csrf_cookie
            
        return response

if frontend_url:
    origins.append(frontend_url)
else:
    print("WARNING: FRONTEND_URL environment variable is not set!")

app.add_middleware(ContentSizeLimitMiddleware)
app.add_middleware(CSRFMiddleware)

app.add_middleware(
    CORSMiddleware, # type: ignore
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-CSRF-Token"]
)

# Include routers
app.include_router(auth.router)
app.include_router(leaves.router)
app.include_router(ai_chat.router)
app.include_router(complaints.router)
app.include_router(documents.router)
app.include_router(google_auth.router)
app.include_router(users.router)