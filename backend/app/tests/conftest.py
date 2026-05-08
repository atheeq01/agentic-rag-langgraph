# ─────────────────────────────────────────────────────────────────────────────

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

# 1. CREATE THE SQLITE TEST ENGINE FIRST
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool  # Ensures the in-memory DB persists across the test
)

# 2. HIJACK THE BACKEND'S ENGINE BEFORE IT LOADS
# By doing this, when main.py tries to use the database, it gets our SQLite test engine instead of the production Postgres one!
import app.db.session
app.db.session.engine = test_engine

# 3. MOCK ASYNCPOSTGRESSAVER TO PREVENT EVENT LOOP ERRORS
import langgraph.checkpoint.postgres.aio
from langgraph.checkpoint.memory import MemorySaver
import psycopg_pool
import pinecone

class MockAsyncPostgresSaver(MemorySaver):
    async def setup(self):
        pass

class MockPool:
    async def open(self):
        pass
    def __init__(self, *args, **kwargs):
        pass

class MockPinecone:
    def __init__(self, *args, **kwargs):
        pass
    def list_indexes(self):
        class MockList:
            def names(self):
                return ["enterprise-hr-index-v2"]
        return MockList()
    def describe_index(self, *args, **kwargs):
        class MockInfo:
            host = "dummy-host"
        return MockInfo()
    def Index(self, *args, **kwargs):
        class MockConfig:
            host = "dummy-host"
            api_key = "dummy-api-key"
        class MockIndex:
            config = MockConfig()
            def __init__(self, *args, **kwargs): pass
            def describe_index_stats(self):
                return {"dimension": 3072}
        return MockIndex()

langgraph.checkpoint.postgres.aio.AsyncPostgresSaver = lambda pool: MockAsyncPostgresSaver()
psycopg_pool.AsyncConnectionPool = MockPool
pinecone.Pinecone = MockPinecone

# 4. NOW IT IS SAFE TO IMPORT YOUR APP
from app.main import app
from app.db.session import get_db
from app.db.session import Base

from app.models.user import User
from app.models.chat import ChatSession
from app.models.complaint import Complaint
from app.models.leave import Leave

# Use the test engine for our local sessions
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="function")
def db():
    # Create the tables fresh for each test
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

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as c:
        yield c