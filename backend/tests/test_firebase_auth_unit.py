"""Unit tests for Firebase ID-token verification (no network, no database).

Run from backend/:  python -m pytest -p no:cacheprovider --noconftest tests/test_firebase_auth_unit.py
"""
import asyncio
import os
import sys
import time
from pathlib import Path

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ["FIREBASE_PROJECT_ID"] = "si-test"
import auth_routes as ar  # noqa: E402

KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
OTHER = rsa.generate_private_key(public_exponent=65537, key_size=2048)


@pytest.fixture(autouse=True)
def fake_google_keys(monkeypatch):
    async def keys():
        return {"k1": KEY.public_key()}
    monkeypatch.setattr(ar, "firebase_keys", keys)


def token(key=KEY, kid="k1", **over):
    claims = {"iss": "https://securetoken.google.com/si-test", "aud": "si-test", "sub": "uid-1",
              "phone_number": "+919812345678", "iat": int(time.time()), "exp": int(time.time()) + 3600}
    claims.update(over)
    return jwt.encode({k: v for k, v in claims.items() if v is not None}, key, algorithm="RS256", headers={"kid": kid})


def verify(t):
    return asyncio.run(ar.verify_firebase_token(t))


def test_valid_token():
    claims = verify(token())
    assert claims["sub"] == "uid-1"
    assert ar.norm_phone(claims["phone_number"]) == "9812345678"


@pytest.mark.parametrize("bad", [
    {"aud": "another-project"},
    {"iss": "https://securetoken.google.com/another-project"},
    {"exp": int(time.time()) - 3600},
    {"phone_number": None},
    {"sub": None},
])
def test_rejected_claims(bad):
    with pytest.raises(HTTPException) as e:
        verify(token(**bad))
    assert e.value.status_code == 401


def test_rejects_wrong_signature_and_unknown_key():
    for t in (token(key=OTHER), token(kid="unknown"), "not-a-jwt"):
        with pytest.raises(HTTPException) as e:
            verify(t)
        assert e.value.status_code == 401


def test_missing_project_id(monkeypatch):
    monkeypatch.delenv("FIREBASE_PROJECT_ID")
    with pytest.raises(HTTPException) as e:
        verify(token())
    assert e.value.status_code == 503
