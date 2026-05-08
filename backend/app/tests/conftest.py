import sys
from unittest.mock import MagicMock, AsyncMock

# ── Patch ALL external services BEFORE app import ────────────────────────────
# Several modules make real network calls / require a running event loop at
# MODULE LOAD TIME. We must mock them all before `from app.main import app`.

# 1. Pinecone — calls list_indexes() + describe_index() at module level
_pinecone_index_mock = MagicMock()
_pinecone_index_mock.host = "mock-host.pinecone.io"
_pinecone_instance = MagicMock()
_pinecone_instance.list_indexes.return_value.names.return_value = ["enterprise-hr-index-v2"]
_pinecone_instance.describe_index.return_value = _pinecone_index_mock
_pinecone_instance.Index.return_value = MagicMock()
_pinecone_mod = MagicMock()
_pinecone_mod.Pinecone.return_value = _pinecone_instance
_pinecone_mod.ServerlessSpec = MagicMock()
sys.modules["pinecone"] = _pinecone_mod

# 2. langchain_pinecone — PineconeVectorStore() runs at module level
_lc_pinecone_mod = MagicMock()
_lc_pinecone_mod.PineconeVectorStore = MagicMock(return_value=MagicMock())
sys.modules["langchain_pinecone"] = _lc_pinecone_mod

# 3. psycopg_pool — AsyncConnectionPool is created at module level in orchestrator.py
_pool_mock = MagicMock()
_pool_mock.open = AsyncMock()
_psycopg_pool_mod = MagicMock()
_psycopg_pool_mod.AsyncConnectionPool.return_value = _pool_mock
_psycopg_pool_mod.ConnectionPool = MagicMock()
sys.modules["psycopg_pool"] = _psycopg_pool_mod

# 4. langgraph checkpoint postgres — AsyncPostgresSaver(pool) called at module level.
#    langgraph validates checkpointers with isinstance(BaseCheckpointSaver), so
#    MagicMock fails. Use the real InMemorySaver which passes the check.
from langgraph.checkpoint.memory import MemorySaver as _InMemorySaver
_checkpointer_real = _InMemorySaver()
_lg_postgres_mod = MagicMock()
_lg_postgres_mod.AsyncPostgresSaver.return_value = _checkpointer_real
sys.modules["langgraph.checkpoint.postgres.aio"] = _lg_postgres_mod
sys.modules["langgraph.checkpoint.postgres"] = _lg_postgres_mod

# 5. langchain_google_genai — ChatGoogleGenerativeAI instantiated at module level
_genai_mod = MagicMock()
_genai_mod.ChatGoogleGenerativeAI = MagicMock(return_value=MagicMock())
sys.modules["langchain_google_genai"] = _genai_mod

# ─────────────────────────────────────────────────────────────────────────────

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.main import app
from app.db.session import get_db
from app.db.session import Base

from app.models.user import User
from app.models.chat import ChatSession
from app.models.complaint import Complaint
from app.models.leave import Leave

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool  # This ensures the in-memory DB persists across the test
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db():
    # Create the tables fresh for each test
    Base.metadata.create_all(bind=engine)

    db_session = TestingSessionLocal()
    try:
        yield db_session
    finally:
        db_session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db):
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as c:
        yield c