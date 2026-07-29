from typing import Annotated

from fastapi import Cookie, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import SESSION_COOKIE_NAME
from app.db.session import get_db
from app.models.user import User
from app.services import auth_service

DatabaseSession = Annotated[Session, Depends(get_db)]


def get_current_user(
    db: DatabaseSession,
    session_token: Annotated[str | None, Cookie(alias=SESSION_COOKIE_NAME)] = None,
) -> User:
    if session_token is None:
        raise HTTPException(
            status_code=401,
            detail="Not authenticated",
        )

    session = auth_service.get_valid_session(db, session_token)

    if session is None:
        raise HTTPException(
            status_code=401,
            detail="Not authenticated",
        )

    user = db.get(User, session.user_id)
    assert user is not None, (
        "UserSession.user_id has ondelete=CASCADE; a valid session implies its user exists"
    )

    return user
