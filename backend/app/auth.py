from __future__ import annotations

import base64
import hmac
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import get_settings

bearer_scheme = HTTPBearer(auto_error=False)


def verify_credentials(username: str, password: str) -> bool:
    settings = get_settings()
    user_ok = hmac.compare_digest(username.encode("utf-8"), settings.app_basic_auth_user.encode("utf-8"))
    pass_ok = hmac.compare_digest(password.encode("utf-8"), settings.app_basic_auth_pass.encode("utf-8"))
    return user_ok and pass_ok


def create_access_token(username: str) -> str:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    payload = {
        "sub": username,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=settings.jwt_expire_minutes)).timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm="HS256")


def require_auth(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> str:
    """Authenticate via JWT Bearer token or HTTP Basic Auth header."""
    settings = get_settings()

    if credentials and credentials.scheme.lower() == "bearer":
        try:
            payload = jwt.decode(credentials.credentials, settings.jwt_secret_key, algorithms=["HS256"])
            sub = payload.get("sub")
            if sub:
                return str(sub)
        except jwt.PyJWTError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired session token",
            ) from exc

    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Basic "):
        try:
            decoded = base64.b64decode(auth_header[6:]).decode("utf-8")
            username, _, password = decoded.partition(":")
            if verify_credentials(username, password):
                return username
        except Exception:
            pass

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required",
        headers={"WWW-Authenticate": "Bearer"},
    )
