"""Tests for V2 /api/solar/resource endpoint (Open-Meteo integration)."""
import os
import pytest
import requests
from pathlib import Path


def _load_base():
    url = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
    if url:
        return url
    env = Path("/app/frontend/.env").read_text()
    for line in env.splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            return line.split("=", 1)[1].strip().rstrip("/")
    return ""


BASE_URL = _load_base()
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


REQUIRED_FIELDS = {
    "avgDailyGHI", "avgSunshineHours", "sunnyDays",
    "totalDaysAnalyzed", "periodStart", "periodEnd", "location",
}


def _validate_solar_payload(data):
    missing = REQUIRED_FIELDS - set(data.keys())
    assert not missing, f"Missing fields: {missing}. Got keys: {list(data.keys())}"
    assert isinstance(data["avgDailyGHI"], (int, float)) and data["avgDailyGHI"] > 0
    assert isinstance(data["sunnyDays"], int) and 0 <= data["sunnyDays"] <= 400
    assert data["totalDaysAnalyzed"] > 300
    assert data["location"].get("label")
    assert "lat" in data["location"] and "lon" in data["location"]


class TestSolarResource:
    def test_no_params_returns_400(self, client):
        r = client.get(f"{API}/solar/resource", timeout=30)
        assert r.status_code == 400
        assert "detail" in r.json()

    def test_city_jaipur(self, client):
        r = client.get(f"{API}/solar/resource",
                       params={"city": "Jaipur", "state": "Rajasthan"}, timeout=45)
        assert r.status_code == 200, r.text
        data = r.json()
        _validate_solar_payload(data)
        # Jaipur should be sunny (>200 sunny days/yr, GHI>4)
        assert data["avgDailyGHI"] >= 3.5
        assert data["sunnyDays"] >= 150

    def test_pincode_jaipur(self, client):
        r = client.get(f"{API}/solar/resource",
                       params={"pincode": "302001"}, timeout=45)
        # 200 = resolved, 404 = pincode not resolved (acceptable per instructions)
        assert r.status_code in (200, 404), r.text
        if r.status_code == 200:
            _validate_solar_payload(r.json())
        else:
            assert "detail" in r.json()

    def test_invalid_pincode_returns_404(self, client):
        r = client.get(f"{API}/solar/resource",
                       params={"pincode": "000000"}, timeout=30)
        assert r.status_code == 404
        assert "detail" in r.json()

    def test_latlon_direct(self, client):
        # Bangalore approx
        r = client.get(f"{API}/solar/resource",
                       params={"lat": 12.97, "lon": 77.59}, timeout=45)
        assert r.status_code == 200, r.text
        _validate_solar_payload(r.json())

    def test_cache_hit(self, client):
        # Second call for Jaipur should be cached
        r = client.get(f"{API}/solar/resource",
                       params={"city": "Jaipur", "state": "Rajasthan"}, timeout=30)
        assert r.status_code == 200
        assert r.json().get("cached") is True
