import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Ensure test DB
TEST_DB_URL = "sqlite:///./test_lastmile.db"
os.environ["DATABASE_URL"] = TEST_DB_URL
os.environ["ENVIRONMENT"] = "test"

from backend.app.core.database import Base, get_db
from backend.app.core.security import create_access_token
from backend.app.models import UserRole
from backend.app.db.init_db import init_db
from backend.app.main import app

test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    init_db(db)
    db.close()
    yield
    Base.metadata.drop_all(bind=test_engine)
    if os.path.exists("./test_lastmile.db"):
        try:
            os.remove("./test_lastmile.db")
        except Exception:
            pass

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def coordinator_headers():
    token = create_access_token({"sub": "1", "email": "coordinator@lastmile.demo", "role": UserRole.COORDINATOR.value})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def approver_headers():
    token = create_access_token({"sub": "2", "email": "approver@lastmile.demo", "role": UserRole.APPROVER.value})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def responder_headers():
    token = create_access_token({"sub": "3", "email": "responder@lastmile.demo", "role": UserRole.RESPONDER.value})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def resident_headers():
    token = create_access_token({"sub": "4", "email": "resident@lastmile.demo", "role": UserRole.RESIDENT.value})
    return {"Authorization": f"Bearer {token}"}
