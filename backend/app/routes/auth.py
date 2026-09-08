from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth import DEMO_PASSWORD_HASH, DEMO_USERNAME, create_access_token, current_user, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/login")
async def login(payload: LoginRequest) -> dict:
    if payload.username != DEMO_USERNAME or not verify_password(payload.password, DEMO_PASSWORD_HASH):
        raise HTTPException(status_code=401, detail="Invalid username or password.")
    return {"access_token": create_access_token(payload.username), "token_type": "bearer"}


@router.get("/me")
async def me(user: dict = Depends(current_user)) -> dict:
    return {"username": user["sub"], "role": user.get("role", "analyst")}
