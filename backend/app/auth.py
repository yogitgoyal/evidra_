"""Small JWT authentication helpers used by the API routes."""

import base64
import hashlib
import hmac
import json
import os
import time

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

import bcrypt

SECRET_KEY = os.getenv("SECRET_KEY", "evidra-demo-secret-change-me")
DEMO_USERNAME = os.getenv("DEMO_USERNAME", "demo")
DEMO_PASSWORD = os.getenv("DEMO_PASSWORD", "evidra-demo")

def hash_password(password: str) -> str:
    prehashed = hashlib.sha256(password.encode("utf-8")).digest()
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(prehashed, salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        prehashed = hashlib.sha256(plain_password.encode("utf-8")).digest()
        return bcrypt.checkpw(prehashed, hashed_password.encode("utf-8"))
    except Exception:
        return False

DEMO_PASSWORD_HASH = hash_password(DEMO_PASSWORD)
_bearer = HTTPBearer(auto_error=False)


def _part(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode()


def create_access_token(username: str, role: str = "analyst", expires_in: int = 3600) -> str:
    header = _part(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
    payload = _part(json.dumps({
        "sub": username, "role": role, "exp": int(time.time()) + expires_in,
    }, separators=(",", ":")).encode())
    unsigned = f"{header}.{payload}".encode()
    signature = _part(hmac.new(SECRET_KEY.encode(), unsigned, hashlib.sha256).digest())
    return f"{header}.{payload}.{signature}"


def decode_access_token(token: str) -> dict:
    try:
        header, payload, signature = token.split(".")
        unsigned = f"{header}.{payload}".encode()
        expected = _part(hmac.new(SECRET_KEY.encode(), unsigned, hashlib.sha256).digest())
        if not hmac.compare_digest(signature, expected):
            raise ValueError("invalid signature")
        data = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
        if int(data["exp"]) <= int(time.time()):
            raise ValueError("expired token")
        return data
    except (ValueError, KeyError, TypeError, json.JSONDecodeError, UnicodeDecodeError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token.")


async def current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> dict:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Bearer token required.")
    return decode_access_token(credentials.credentials)


require_officer = current_user
