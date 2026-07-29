import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models.session import UserSession
from app.models.user import User
from app.schemas.auth import SignupRequest


def get_user_by_email(db: Session, email: str) -> User | None:
    statement = select(User).where(User.email == email)
    return db.scalar(statement)


def create_user(db: Session, signup_data: SignupRequest) -> User:
    hashed_password = hash_password(signup_data.password)
    user = User(email=signup_data.email, hashed_password=hashed_password)
    db.add(user)
    db.commit()
    db.refresh(user)

    return user


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    find_user = get_user_by_email(db, email)
    if not find_user:
        return None
    if not verify_password(password, find_user.hashed_password):
        return None
    return find_user


def create_session(db: Session, user: User) -> UserSession:
    token = secrets.token_urlsafe(32)

    user_session = UserSession(
        token=token,
        user_id=user.id,
        expires_at=datetime.now(timezone.utc) + timedelta(days=14),
    )
    db.add(user_session)
    db.commit()
    db.refresh(user_session)

    return user_session


def get_valid_session(db: Session, token: str) -> UserSession | None:
    find_session = db.scalar(select(UserSession).where(UserSession.token == token))
    if not find_session:
        return None
    if find_session.expires_at < datetime.now(timezone.utc):
        db.delete(find_session)
        db.commit()
        return None
    return find_session


def delete_session(db: Session, session: UserSession) -> None:
    db.delete(session)
    db.commit()
