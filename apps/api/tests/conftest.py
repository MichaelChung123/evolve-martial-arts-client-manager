import os
from collections.abc import Callable, Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.api.deps import get_current_user
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.session import UserSession  # noqa: F401  (registers table metadata)
from app.models.student import Student
from app.models.user import User

TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+psycopg://evolve:evolve@localhost:5432/evolve_test",
)


@pytest.fixture(scope="session")
def engine() -> Generator[Engine, None, None]:
    engine = create_engine(TEST_DATABASE_URL, pool_pre_ping=True)
    Base.metadata.create_all(bind=engine)

    yield engine

    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture
def db_session(engine: Engine) -> Generator[Session, None, None]:
    """One transaction per test, rolled back afterward, so tests never leak.

    The session joins the connection's open transaction with a savepoint, so
    application code may call commit() while the outer rollback still undoes
    everything.
    """
    connection = engine.connect()
    transaction = connection.begin()
    session = sessionmaker(bind=connection, autoflush=False, autocommit=False)()

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def current_user(db_session: Session) -> User:
    """A synthetic staff user. The students router sits behind get_current_user."""
    user = User(
        email="staff@example.com",
        hashed_password="not-a-real-hash",
    )

    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    return user


@pytest.fixture
def client(
    db_session: Session,
    current_user: User,
) -> Generator[TestClient, None, None]:
    app.dependency_overrides[get_db] = lambda: db_session
    app.dependency_overrides[get_current_user] = lambda: current_user

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture
def make_student(db_session: Session) -> Callable[..., Student]:
    """Factory for synthetic students. Never use real student data.

    Emails use example.com, not example.test: RFC 2606 reserves .test as a
    special-use TLD and email-validator rejects it, so EmailStr response
    serialization would fail on every student this factory made.
    """
    counter = {"n": 0}

    def _make(**overrides: object) -> Student:
        counter["n"] += 1
        n = counter["n"]

        defaults: dict[str, object] = {
            "first_name": f"Test{n}",
            "last_name": "Student",
            "email": f"student{n}@example.com",
            "phone": None,
            "date_of_birth": None,
        }
        student = Student(**{**defaults, **overrides})

        db_session.add(student)
        db_session.commit()
        db_session.refresh(student)

        return student

    return _make
