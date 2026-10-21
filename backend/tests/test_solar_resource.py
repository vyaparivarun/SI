"""API tests for GET /api/solar/resource (V3 schema: India Post verified location + 5-source GHI consensus)."""
import os
import time
from pathlib import Path

import pytest
import requests


def _load_base():
    url = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
    if url:
        return url
    for line in Path("/app/frontend/.env").read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            return line.split("=", 1)[1].strip().rstrip("/")
    raise RuntimeError("REACT_APP_BACKEND_URL missing")


API = f"{_load_base()}/api/solar/resource"
SOURCE_IDS = {"gsa", "nasa_clim", "pvgis", "om_era5", "nasa_daily"}


@pytest.fixture(scope="module")
def s():
    return requests.Session()


# ---- Pincode -> correct state/district + full schema ----
PINS = [
    ("201010", "Uttar Pradesh", "Ghaziabad"),
    ("400070", "Maharashtra", "Mumbai"),
    ("560058", "Karnataka", "Bangalore"),
    ("380015", "Gujarat", "Ahmedabad"),
    ("122002", "Haryana", "Gurgaon"),
    ("110020", "Delhi (NCT)", None),
    ("682001", "Kerala", "Ernakulam"),
    ("744101", "Andaman & Nicobar", "South Andaman"),
    ("194101", "Ladakh", None),
]


@pytest.mark.parametrize("pin,state,district", PINS)
def test_pincode_resolves(s, pin, state, district):
    r = s.get(API, params={"pincode": pin}, timeout=150)
    assert r.status_code == 200, r.text
    d = r.json()
    loc = d["location"]
    assert loc["pincode"] == pin
    assert loc["state"] == state, loc
    if district:
        assert district.lower() in (loc["district"] or "").lower(), loc
    assert loc["verifiedBy"] == "India Post"
    for k in ("districts", "postOffices", "label", "precision"):
        assert k in loc
    assert isinstance(loc["districts"], list) and loc["districts"]
    assert d["status"] in {"live", "cached", "stale"}, d
    assert loc["lat"] is not None and loc["lon"] is not None and loc.get("geocoder")
    assert 3.5 <= d["avgDailyGHI"] <= 6.5, d["avgDailyGHI"]
    assert abs(d["annualGHI"] - round(d["avgDailyGHI"] * 365)) <= 1
    assert d["confidence"] in {"high", "medium", "low"}
    assert isinstance(d["spreadPct"], (int, float))
    assert d["sourcesTried"] == 5
    assert 1 <= d["sourcesUsed"] <= 5
    ids = {x["id"] for x in d["sources"]}
    assert ids == SOURCE_IDS
    for x in d["sources"]:
        for k in ("id", "name", "period", "avgDailyGHI", "used", "ok", "note"):
            assert k in x
    assert sum(1 for x in d["sources"] if x["used"]) == d["sourcesUsed"]
    assert d["monthlyGHI"] is None or len(d["monthlyGHI"]) == 12
    assert "sunnyDays" in d and "sunnyDaysRange" in d and "fetchedAt" in d
    print(pin, loc["label"], loc["precision"], loc["geocoder"], d["avgDailyGHI"], d["confidence"],
          d["sourcesUsed"], d["sunnyDays"], d["status"])


def test_201010_sunny_days_numeric(s):
    d = s.get(API, params={"pincode": "201010"}, timeout=150).json()
    assert isinstance(d["sunnyDays"], int) and 100 < d["sunnyDays"] < 365
    assert d["location"]["precision"] in {"pincode", "district"}


def test_second_call_cached(s):
    s.get(API, params={"pincode": "560058"}, timeout=150)
    t = time.time()
    d = s.get(API, params={"pincode": "560058"}, timeout=60).json()
    assert d["status"] == "cached"
    assert time.time() - t < 10


# ---- Validation & errors ----
@pytest.mark.parametrize("pin", ["12345", "abcdef", "012345", "1234567"])
def test_invalid_pincode_422(s, pin):
    r = s.get(API, params={"pincode": pin}, timeout=30)
    assert r.status_code == 422
    assert "6-digit" in r.json()["detail"]


def test_nonexistent_pincode_404(s):
    r = s.get(API, params={"pincode": "999999"}, timeout=60)
    assert r.status_code == 404, r.text
    assert "not found in India Post records" in r.json()["detail"]


def test_no_params_422(s):
    r = s.get(API, timeout=30)
    assert r.status_code == 422
    assert isinstance(r.json()["detail"], str)


def test_coords_outside_india_422(s):
    r = s.get(API, params={"lat": 51.5, "lon": -0.1}, timeout=30)
    assert r.status_code == 422
    assert "outside India" in r.json()["detail"]


def test_coords_non_numeric_422(s):
    r = s.get(API, params={"lat": "abc", "lon": "77"}, timeout=30)
    assert r.status_code == 422


def test_city_state(s):
    r = s.get(API, params={"city": "Jaipur", "state": "Rajasthan"}, timeout=150)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["location"]["precision"] == "city"
    assert d["location"]["state"] == "Rajasthan"
    assert 4.5 <= d["avgDailyGHI"] <= 6.5


def test_city_unknown_no_500(s):
    r = s.get(API, params={"city": "Qwzxqwzx"}, timeout=60)
    assert r.status_code in (404, 422), r.text


def test_coords_in_india(s):
    r = s.get(API, params={"lat": 26.9, "lon": 75.8}, timeout=150)
    assert r.status_code == 200
    assert r.json()["location"]["precision"] == "coordinates"
