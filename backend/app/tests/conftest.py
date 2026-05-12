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
    poolclass=StaticPool
)

# HIJACK THE BACKEND'S ENGINE BEFORE IT LOADS
import app.db.session
import unittest.mock as mock
app.db.session.engine = test_engine

import langgraph.checkpoint.postgres.aio
from langgraph.checkpoint.memory import MemorySaver
import psycopg_pool
import pinecone

# ADD THESE TWO LINES TO MOCK EMAILS GLOBALLY
import app.core.email_utils
app.core.email_utils.send_system_notification = lambda *args, **kwargs: None

email_mock = mock.patch("app.core.email_utils.send_system_notification", return_value=None)
email_mock.start()

mock.patch("smtplib.SMTP").start()
mock.patch("smtplib.SMTP_SSL").start()

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

@pytest.fixture(autouse=True)
def mock_ai(monkeypatch):
    """Mocks the AI chat response to prevent real Gemini API calls during tests."""
    async def fake_run_chat(*args, **kwargs):
        return "This is a mocked AI response."
    
    monkeypatch.setattr("app.api.v1.endpoints.ai_chat.run_chat", fake_run_chat)