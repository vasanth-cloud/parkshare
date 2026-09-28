import pytest
from app.core.database import SessionLocal, Base, engine
from scripts.seed_data import seed_db

@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """
    Session-wide fixture that ensures test database schema and base test fixtures
    (test listing & vehicle) are present when running pytest.
    """
    seed_db()
    yield
