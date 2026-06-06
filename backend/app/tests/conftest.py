import pytest
from dotenv import load_dotenv

# 1. LOAD REAL ENVIRONMENT VARIABLES FIRST
load_dotenv()

from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import langgraph.checkpoint.postgres.aio  # noqa: E402
from langgraph.checkpoint.memory import MemorySaver  # noqa: E402
import psycopg_pool  # noqa: E402

class MockAsyncPostgresSaver(MemorySaver):
    def __init__(self, pool):
        super().__init__()
        
    async def setup(self):
        pass

class MockPool:
    async def open(self): pass
    async def close(self): pass
    def __init__(self, *args, **kwargs): pass

langgraph.checkpoint.postgres.aio.AsyncPostgresSaver = MockAsyncPostgresSaver
psycopg_pool.AsyncConnectionPool = MockPool

# 2. CREATE THE SQLITE TEST ENGINE FOR DB
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)

# HIJACK THE BACKEND'S DB ENGINE
import app.db.session  # noqa: E402
app.db.session.engine = test_engine

# 3. IMPORT YOUR APP
from app.main import app  # noqa: E402
from app.db.session import get_db  # noqa: E402
from app.db.session import Base  # noqa: E402

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="function")
def db():
    Base.metadata.create_all(bind=test_engine)
    db_session = TestingSessionLocal()
    try:
        yield db_session
    finally:
        db_session.close()
        Base.metadata.drop_all(bind=test_engine)

@pytest.fixture(scope="function")
def client(db):
    def override_get_db():
        yield db

    from fastapi import FastAPI
    assert isinstance(app, FastAPI)
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c