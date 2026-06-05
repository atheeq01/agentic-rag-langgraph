import os
import pytest
from dotenv import load_dotenv

# 1. LOAD REAL ENVIRONMENT VARIABLES FIRST
load_dotenv()

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

# 2. CREATE THE SQLITE TEST ENGINE FOR DB
# We keep the database local so we don't wipe your real Postgres DB!
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)

# HIJACK THE BACKEND'S DB ENGINE
import app.db.session
app.db.session.engine = test_engine

# 3. IMPORT YOUR APP
from app.main import app
from app.db.session import get_db
from app.db.session import Base

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

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
