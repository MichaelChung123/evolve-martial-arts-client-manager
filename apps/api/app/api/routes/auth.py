from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy.exc import IntegrityError

from app.api.deps import DatabaseSession, get_current_user
from app.core.config import get_settings
from app.core.security import SESSION_COOKIE_NAME
from app.models.session import UserSession
from app.models.user import User
from app.schemas.auth import LoginRequest, SignupRequest, UserResponse
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["Auth"])


def _set_session_cookie(response: Response, session: UserSession) -> None:
    response.set_cookie(
        SESSION_COOKIE_NAME,
        session.token,
        httponly=True,
        samesite="lax",
        secure=get_settings().environment != "development",
        path="/",
        max_age=int((session.expires_at - datetime.now(timezone.utc)).total_seconds()),
    )


@router.post(
    "/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED
)
def signup(
    signup_data: SignupRequest, db: DatabaseSession, response: Response
) -> UserResponse:
    if signup_data.email:
        existing_user = auth_service.get_user_by_email(
            db,
            signup_data.email,
        )

        if existing_user is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this email already exists",
            )
    try:
        user = auth_service.create_user(db, signup_data)
        session = auth_service.create_session(db, user)
        _set_session_cookie(response, session)

        return user

    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        ) from error


@router.post("/login", response_model=UserResponse, status_code=status.HTTP_200_OK)
def login(
    login_data: LoginRequest, db: DatabaseSession, response: Response
) -> UserResponse:
    user = auth_service.authenticate_user(db, login_data.email, login_data.password)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    session = auth_service.create_session(db, user)
    _set_session_cookie(response, session)

    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    db: DatabaseSession,
    response: Response,
    session_token: Annotated[str | None, Cookie(alias=SESSION_COOKIE_NAME)] = None,
) -> Response:
    if session_token is not None:
        session = auth_service.get_valid_session(db, session_token)

        if session is not None:
            auth_service.delete_session(db, session)

    response.delete_cookie(SESSION_COOKIE_NAME, path="/")
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.get("/me", response_model=UserResponse, status_code=status.HTTP_200_OK)
def me(current_user: Annotated[User, Depends(get_current_user)]) -> UserResponse:
    return current_user
