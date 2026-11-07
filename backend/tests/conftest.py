"""Shared fixtures: base URL, user token and admin token.

Integration tests run against a deployed server:
  REACT_APP_BACKEND_URL   e.g. https://si.atoznavigator.com
  SI_TEST_USER_TOKEN      a session token: log in on the site with a Firebase test phone number,
                          then copy the token from the browser's localStorage
  SI_TEST_PHONE           that test phone number (10 digits)
  ADMIN_EMAIL_TEST / ADMIN_PASSWORD_TEST
Tests that need a user or admin are skipped when these are missing.
"""
import os
from pathlib import Path

import pytest
import requests


def _base():
    url = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
    if url:
        return url
    env = Path(__file__).resolve().parents[2] / "frontend" / ".env"
    if env.exists():
        for line in env.read_text().splitlines():
            if line.startswith("REACT_APP_BACKEND_URL="):
                return line.split("=", 1)[1].strip().strip('"').rstrip("/")
    raise RuntimeError("Set REACT_APP_BACKEND_URL to the server to test, e.g. https://si.atoznavigator.com")


BASE_URL = _base()
API = f"{BASE_URL}/api"
TEST_PHONE = os.environ.get("SI_TEST_PHONE", "9999900001")


def _creds():
    txt = ""
    email = os.environ.get("ADMIN_EMAIL_TEST", "friizngtime@gmail.com")
    pw = os.environ.get("ADMIN_PASSWORD_TEST")
    return email, pw, txt


@pytest.fixture(scope="session")
def user_token():
    tok = os.environ.get("SI_TEST_USER_TOKEN")
    if not tok:
        pytest.skip("SI_TEST_USER_TOKEN not set (log in with a Firebase test number to get one)")
    return tok


@pytest.fixture(scope="session")
def user_login(user_token):
    r = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {user_token}"}, timeout=30)
    assert r.status_code == 200, r.text
    return {"token": user_token, "user": r.json()}


@pytest.fixture(scope="session")
def admin_token():
    email, pw, _ = _creds()
    if not pw:
        pytest.skip("ADMIN_PASSWORD_TEST not set")
    r = requests.post(f"{API}/admin/login", json={"email": email, "password": pw}, timeout=30)
    if r.status_code != 200:
        pytest.skip(f"admin login failed: {r.status_code} {r.text}")
    return r.json()["token"]


@pytest.fixture(scope="module")
def user_session(user_token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {user_token}"})
    return s


@pytest.fixture(scope="module")
def admin_session(admin_token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {admin_token}"})
    return s
