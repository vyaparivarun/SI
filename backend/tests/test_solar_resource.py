"""Tests for /api/solar/resource endpoint (multi-source median: Open-Meteo + NASA POWER + PVGIS)."""
import os
import statistics
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


REQUIRED_FIELDS = {"avgDailyGHI", "sources", "method", "location"}


def _validate(data):
    missing = REQUIRED_FIELDS - set(data.keys())
    assert not missing, f"Missing fields: {missing}. Got: {list(data.keys())}"
    assert isinstance(data["avgDailyGHI"], (int, float)) and data["avgDailyGHI"] > 0
    assert isinstance(data["sources"], list) and len(data["sources"]) >= 1
    for src in data["sources"]:
        assert "name" in src and "avgDailyGHI" in src
        assert isinstance(src["avgDailyGHI"], (int, float)) and src["avgDailyGHI"] > 0
    assert "Median of" in data["method"]
    # verify median matches
    ghis = [s["avgDailyGHI"] for s in data["sources"]]
    expected = round(statistics.median(ghis), 2)
    assert abs(data["avgDailyGHI"] - expected) < 0.02, \
        f"avgDailyGHI {data['avgDailyGHI']} != median {expected} of {ghis}"


class TestSolarResource:
    def test_no_params_returns_400(self, client):
        r = client.get(f"{API}/solar/resource", timeout=30)
        assert r.status_code == 400
        assert "detail" in r.json()

    def test_city_mumbai(self, client):
        r = client.get(f"{API}/solar/resource",
                       params={"city": "Mumbai", "state": "Maharashtra"}, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        _validate(data)
        assert len(data["sources"]) >= 2, f"Expected 2-3 sources, got {len(data['sources'])}"
        # Sunny days for Mumbai should be realistic (~150-260), NOT ~354
        if data.get("sunnyDays") is not None:
            assert 100 <= data["sunnyDays"] <= 300, \
                f"sunnyDays {data['sunnyDays']} unrealistic for Mumbai"
        # GHI in reasonable range for India
        assert 3.5 <= data["avgDailyGHI"] <= 7.0
        print(f"Mumbai: GHI={data['avgDailyGHI']}, sunnyDays={data.get('sunnyDays')}, "
              f"sources={[(s['name'], s['avgDailyGHI']) for s in data['sources']]}")

    def test_pincode_jaipur(self, client):
        r = client.get(f"{API}/solar/resource",
                       params={"pincode": "302001"}, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        _validate(data)
        assert len(data["sources"]) >= 2
        # Jaipur consensus should be around 5.3-5.5
        assert 4.5 <= data["avgDailyGHI"] <= 6.2, \
            f"Jaipur GHI {data['avgDailyGHI']} outside expected 4.5-6.2"
        if data.get("sunnyDays") is not None:
            assert 150 <= data["sunnyDays"] <= 300, \
                f"Jaipur sunnyDays {data['sunnyDays']} out of realistic band"
        print(f"Jaipur: GHI={data['avgDailyGHI']}, sunnyDays={data.get('sunnyDays')}, "
              f"sources={[(s['name'], s['avgDailyGHI']) for s in data['sources']]}")

    def test_invalid_pincode_returns_404_state_avg(self, client):
        r = client.get(f"{API}/solar/resource",
                       params={"pincode": "999999", "state": "Rajasthan"}, timeout=30)
        assert r.status_code == 404
        detail = r.json().get("detail", "").lower()
        assert "state average" in detail or "could not resolve" in detail, \
            f"Expected state-average fallback message, got: {detail}"

    def test_latlon_direct(self, client):
        r = client.get(f"{API}/solar/resource",
                       params={"lat": 12.97, "lon": 77.59}, timeout=60)
        assert r.status_code == 200, r.text
        _validate(r.json())
