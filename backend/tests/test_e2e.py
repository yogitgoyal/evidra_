import os
import pytest
import asyncio
import urllib.request
import json
from sqlalchemy import text
from app.db import engine, SessionLocal
from app.reports import _plain

def test_env_hygiene():
    assert os.getenv("DATABASE_URL") is not None, "DATABASE_URL must be set in .env"
    assert "postgresql" in os.getenv("DATABASE_URL"), "DATABASE_URL must point to PostgreSQL"

def test_pdf_unicode_formatting():
    input_str = "₹48,000 transferred A/C ••2290 — Sector 18"
    output_str = _plain(input_str)
    assert "?" not in output_str, f"Unicode characters should not be mangled to '?': {output_str}"
    assert "Rs." in output_str
    assert "-" in output_str

def test_passlib_bcrypt_import():
    import passlib
    import bcrypt
    assert passlib.__version__ is not None
    assert bcrypt.__file__ is not None

@pytest.mark.asyncio
async def test_neon_postgres_live_query():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT version();"))
        version = res.scalar()
        assert "PostgreSQL" in version

@pytest.mark.asyncio
async def test_audit_log_persisted_in_neon():
    async with SessionLocal() as db:
        res = await db.execute(text("SELECT count(*) FROM audit_log_entries;"))
        count = res.scalar()
        assert count >= 1

def test_api_e2e_flow():
    base_url = "http://127.0.0.1:8000"
    
    # Auth login
    login_req = urllib.request.Request(
        f"{base_url}/auth/login",
        data=json.dumps({"username": "demo", "password": "evidra-demo"}).encode(),
        headers={"Content-Type": "application/json"}
    )
    login_resp = json.loads(urllib.request.urlopen(login_req).read())
    assert "access_token" in login_resp
    token = login_resp["access_token"]
    
    # Auth me
    me_req = urllib.request.Request(f"{base_url}/auth/me", headers={"Authorization": f"Bearer {token}"})
    me_resp = json.loads(urllib.request.urlopen(me_req).read())
    assert me_resp["username"] == "demo"
    
    # Dashboard summary
    sum_req = urllib.request.Request(f"{base_url}/dashboard/summary", headers={"Authorization": f"Bearer {token}"})
    sum_resp = json.loads(urllib.request.urlopen(sum_req).read())
    assert sum_resp["caseCount"] >= 1
    assert sum_resp["provenanceVerified"] is True
