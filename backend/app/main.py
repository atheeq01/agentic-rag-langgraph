from fastapi import FastAPI
from app.api.v1.endpoints import auth
from app.api.v1.endpoints import leaves
from app.api.v1.endpoints import ai_chat
from app.api.v1.endpoints import complaints
from app.db.session import Base, engine

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="HR AI System Backend")

# Include routers
app.include_router(auth.router)
app.include_router(leaves.router)
app.include_router(ai_chat.router)
app.include_router(complaints.router)