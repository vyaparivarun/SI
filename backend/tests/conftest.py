"""Shared fixtures: base URL, user token (OTP test number) and admin token."""
import os
from pathlib import Path

import pytest
import requests


def _base():
    url = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
    if url:
        return url
    for line in Path("/app/frontend/.env").read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            return line.split("=", 1)[1].strip().strip('"').rstrip("/")
    raise RuntimeError("REACT_APP_BACKEND_URL missing")


BASE_URL = _base()
API = f"{BASE_URL}/api"
TEST_PHONE = "9999900001"
TEST_PHONE_2 = "9999900002"
TEST_OTP = "246810"


def _creds():
    txt = Path("/app/memory/test_credentials.md").read_text() if Path("/app/memory/test_credentials.md").exists() else ""
    email = os.environ.get("ADMIN_EMAIL_TEST", "friizngtime@gmail.com")
    pw = os.environ.get("ADMIN_PASSWORD_TEST")
    if not pw:
        for line in Path("/app/backend/.env").read_text().splitlines():
            if line.startswith("ADMIN_PASSWORD="):
                pw = line.split("=", 1)[1].strip().strip('"')
    return email, pw, txt


def login_user(phone=TEST_PHONE, name="TEST_User One"):
    # verify works directly for configured test numbers (no SMS send needed -> no send rate limit)
    r = requests.post(f"{API}/auth/otp/verify", json={"phone": phone, "name": name, "code": TEST_OTP}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()


@pytest.fixture(scope="session")
def user_login():
    return login_user()


@pytest.fixture(scope="session")
def user_token(user_login):
    return user_login["token"]


@pytest.fixture(scope="session")
def admin_token():
    email, pw, _ = _creds()
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
