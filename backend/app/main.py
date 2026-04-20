from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.endpoints import auth, leaves, ai_chat, complaints, documents
from app.db.session import Base, engine

# Create tables
Base.metadata.create_all(bind=engine)
origins = [
    "http://localhost:5173",  # React dev server
    "http://127.0.0.1:5173",
]

app = FastAPI(title="HR AI System Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]  )
# Include routers
app.include_router(auth.router)
app.include_router(leaves.router)
app.include_router(ai_chat.router)
app.include_router(complaints.router)
app.include_router(documents.router)