"""Auth (Firebase phone login), activity, bills (GridFS), admin APIs and route security."""
import io

import pytest
import requests

from conftest import API, TEST_PHONE, _creds


# ---------- route security ----------
class TestSecurity:
    def test_root_public(self):
        r = requests.get(f"{API}/")
        assert r.status_code == 200 and r.json()["status"] == "ok"

    @pytest.mark.parametrize("method,path", [
        ("get", "/solar/resource?pincode=110032"), ("post", "/leads"), ("get", "/stats"),
        ("get", "/epc/partners"), ("get", "/auth/me"), ("post", "/activity"),
        ("get", "/admin/overview"), ("get", "/admin/users"), ("get", "/leads"),
    ])
    def test_no_token_401(self, method, path):
        r = getattr(requests, method)(f"{API}{path}", json={})
        assert r.status_code == 401, (path, r.status_code, r.text)

    def test_bad_token_401(self):
        r = requests.get(f"{API}/auth/me", headers={"Authorization": "Bearer abc.def.ghi"})
        assert r.status_code == 401

    def test_user_token_cannot_access_admin(self, user_session):
        for p in ("/admin/overview", "/admin/users", "/leads"):
            assert user_session.get(f"{API}{p}").status_code == 401, p

    def test_user_token_solar_resource_200(self, user_session):
        r = user_session.get(f"{API}/solar/resource", params={"pincode": "202001"}, timeout=90)
        assert r.status_code == 200, r.text
        loc = r.json()["location"]
        assert loc["state"] == "Uttar Pradesh"
        assert "Aligarh" in (loc.get("district") or "")


# ---------- Firebase phone login ----------
class TestFirebaseLogin:
    def test_rejects_garbage_token(self):
        r = requests.post(f"{API}/auth/firebase", json={"idToken": "x" * 40, "name": "TEST_X"})
        assert r.status_code in (401, 503), r.text

    def test_rejects_short_token_and_name(self):
        assert requests.post(f"{API}/auth/firebase", json={"idToken": "abc", "name": "TEST_X"}).status_code == 422
        assert requests.post(f"{API}/auth/firebase", json={"idToken": "x" * 40, "name": "A"}).status_code == 422

    def test_verify_and_me(self, user_login, user_session):
        u = user_login["user"]
        assert u["phone"] == TEST_PHONE and u["role"] == "user" and isinstance(u["id"], str)
        r = user_session.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["phone"] == TEST_PHONE
        assert "_id" not in r.json()


# ---------- activity & bills ----------
class TestActivity:
    def test_save_savings_and_loan(self, user_session):
        for kind in ("savings_calc", "loan_calc"):
            r = user_session.post(f"{API}/activity", json={"kind": kind, "title": f"TEST_{kind}", "inputs": {"a": 1}, "summary": {"b": 2}})
            assert r.status_code == 200, r.text
            assert r.json()["saved"] is True
        r = user_session.post(f"{API}/activity", json={"kind": "bogus"})
        assert r.status_code == 422

    def test_bill_upload_valid(self, user_session):
        files = {"file": ("TEST_bill.pdf", b"%PDF-1.4 test bill", "application/pdf")}
        r = user_session.post(f"{API}/bills", files=files)
        assert r.status_code == 200, r.text
        assert r.json()["uploaded"] is True
        pytest.bill_file_id = r.json()["fileId"]

    def test_bill_upload_bad_type(self, user_session):
        r = user_session.post(f"{API}/bills", files={"file": ("x.txt", b"hello", "text/plain")})
        assert r.status_code == 422

    def test_bill_upload_too_big(self, user_session):
        r = user_session.post(f"{API}/bills", files={"file": ("big.png", b"0" * (4 * 1024 * 1024 + 10), "image/png")})
        assert r.status_code == 413

    def test_bill_upload_empty(self, user_session):
        r = user_session.post(f"{API}/bills", files={"file": ("e.png", b"", "image/png")})
        assert r.status_code == 422

    def test_lead_with_user(self, user_session):
        r = user_session.post(f"{API}/leads", json={"name": "TEST_Lead U1", "mobile": TEST_PHONE, "monthlyBill": 100000})
        assert r.status_code == 200, r.text
        pytest.u1_lead = r.json()["leadId"]


# ---------- admin ----------
class TestAdmin:
    def test_admin_wrong_password(self):
        email, _, _ = _creds()
        r = requests.post(f"{API}/admin/login", json={"email": email, "password": "wrong-pass"})
        assert r.status_code == 401
        assert "Wrong email or password" in r.json()["detail"]

    def test_overview(self, admin_session, user_token):
        r = admin_session.get(f"{API}/admin/overview")
        assert r.status_code == 200
        d = r.json()
        for k in ("users", "newUsers7d", "activeUsers7d", "savingsCalcs", "loanCalcs", "bills", "leads"):
            assert isinstance(d[k], int), k
        assert d["users"] >= 1

    def test_users_search_and_detail(self, admin_session, user_session):
        # make sure activity exists for this user (classes may run on different workers)
        user_session.post(f"{API}/activity", json={"kind": "loan_calc", "title": "TEST_admin_check"})
        up = user_session.post(f"{API}/bills", files={"file": ("TEST_admin.png", b"\x89PNG\r\n\x1a\nfake", "image/png")})
        assert up.status_code == 200
        fid = up.json()["fileId"]
        r = admin_session.get(f"{API}/admin/users", params={"q": "99999000"})
        assert r.status_code == 200
        users = r.json()
        me = next(u for u in users if u["phone"] == TEST_PHONE)
        assert "_id" not in me and me["counts"].get("loan_calc", 0) >= 1
        d = admin_session.get(f"{API}/admin/users/{me['id']}")
        assert d.status_code == 200
        body = d.json()
        kinds = {a["kind"] for a in body["activities"]}
        assert {"loan_calc", "bill_upload"} <= kinds
        b = admin_session.get(f"{API}/admin/bills/{fid}")
        assert b.status_code == 200 and b.content == b"\x89PNG\r\n\x1a\nfake"
        assert b.headers["content-type"].startswith("image/png")
        assert admin_session.get(f"{API}/admin/bills/notanid").status_code == 404
        assert admin_session.get(f"{API}/admin/users/does-not-exist").status_code == 404

    def test_user_cannot_download_bill(self, user_session):
        assert user_session.get(f"{API}/admin/bills/000000000000000000000000").status_code == 401
