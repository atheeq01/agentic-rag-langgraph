import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.endpoints import auth, leaves, ai_chat, complaints, documents, google_auth, users
from app.db.session import Base, engine

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="HR AI System Backend")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


origins = ["https://apex-hr-ca928.web.app"]
frontend_url = os.environ.get("FRONTEND_URL")

if frontend_url:
    origins.append(frontend_url)
else:
    print("WARNING: FRONTEND_URL environment variable is not set!")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Include routers
app.include_router(auth.router)
app.include_router(leaves.router)
app.include_router(ai_chat.router)
app.include_router(complaints.router)
app.include_router(documents.router)
app.include_router(google_auth.router)
app.include_router(users.router)