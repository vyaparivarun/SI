"""Unit-level resilience tests for solar_service (monkeypatched sources/geocoders, in-memory fake DB — never the app DB)."""
import asyncio
import sys
from datetime import timedelta

import pytest

sys.path.insert(0, "/app/backend")
import solar_service as ss  # noqa: E402


# ---- in-memory fake Mongo collection / db ----
class FakeColl:
    def __init__(self):
        self.docs = []

    def _match(self, d, q):
        return all(d.get(k) == v for k, v in q.items())

    async def find_one(self, q, proj=None):
        for d in self.docs:
            if self._match(d, q):
                return {k: v for k, v in d.items() if k != "_id"}
        return None

    async def update_one(self, q, upd, upsert=False):
        for d in self.docs:
            if self._match(d, q):
                d.update(upd["$set"])
                return
        if upsert:
            self.docs.append(dict(upd["$set"]))


class FakeDB:
    def __init__(self):
        self.solar_cache = FakeColl()
        self.geo_cache = FakeColl()


def run(c):
    return asyncio.get_event_loop().run_until_complete(c) if False else asyncio.run(c)


def make_src(val, sunny=None, fail=False, monthly=None):
    async def fn(lat, lon):
        if fail == "timeout":
            raise asyncio.TimeoutError()
        if fail:
            raise RuntimeError("boom")
        out = {"avgDailyGHI": val, "period": "test"}
        if sunny is not None:
            out["sunnyDays"] = sunny
        if monthly:
            out["monthly"] = monthly
        return out
    return fn


def set_sources(monkeypatch, specs):
    ids = ["gsa", "nasa_clim", "pvgis", "om_era5", "nasa_daily"]
    monkeypatch.setattr(ss, "SOURCES", [(i, i.upper(), fn) for i, fn in zip(ids, specs)])


# ---- fetch_solar consensus ----
@pytest.mark.parametrize("nfail", [1, 2, 3, 4])
def test_partial_source_failures(monkeypatch, nfail):
    vals = [5.0, 5.1, 4.9, 5.2, 5.05]
    specs = [make_src(v, fail=(i < nfail) and ("timeout" if i % 2 else True)) for i, v in enumerate(vals)]
    set_sources(monkeypatch, specs)
    out = run(ss.fetch_solar(26.9, 75.8))
    assert out is not None
    assert out["sourcesTried"] == 5
    assert out["sourcesUsed"] == 5 - nfail
    failed = [s for s in out["sources"] if not s["ok"]]
    assert len(failed) == nfail and all(not s["used"] for s in failed)
    assert 4.9 <= out["avgDailyGHI"] <= 5.2


def test_outlier_excluded(monkeypatch):
    set_sources(monkeypatch, [make_src(5.0), make_src(5.1), make_src(4.95), make_src(6.5), make_src(5.05)])
    out = run(ss.fetch_solar(26.9, 75.8))
    o = next(s for s in out["sources"] if s["avgDailyGHI"] == 6.5)
    assert o["used"] is False and "outlier" in o["note"]
    assert out["sourcesUsed"] == 4
    assert out["avgDailyGHI"] == pytest.approx(5.03, abs=0.03)


def test_out_of_range_excluded(monkeypatch):
    set_sources(monkeypatch, [make_src(1.2), make_src(9.9), make_src(5.0), make_src(5.2), make_src(5.1)])
    out = run(ss.fetch_solar(26.9, 75.8))
    bad = [s for s in out["sources"] if s["avgDailyGHI"] in (1.2, 9.9)]
    assert all(not s["used"] and "plausible range" in s["note"] for s in bad)
    assert out["sourcesUsed"] == 3 and out["avgDailyGHI"] == 5.1


def test_two_sources_disagree_no_outlier_logic(monkeypatch):
    # with only 2 valid sources outlier rejection must not apply; confidence must be low if spread >25%
    set_sources(monkeypatch, [make_src(4.0), make_src(6.0), make_src(0, fail=True), make_src(0, fail=True), make_src(0, fail=True)])
    out = run(ss.fetch_solar(26.9, 75.8))
    assert out["sourcesUsed"] == 2 and out["confidence"] == "low"


def test_all_sources_fail_state_only(monkeypatch):
    set_sources(monkeypatch, [make_src(0, fail=True)] * 5)
    db = FakeDB()
    db.geo_cache.docs.append({"key": "pin:201010", "fetchedAt": ss.now_utc().isoformat(),
                              "location": {"pincode": "201010", "state": "Uttar Pradesh", "district": "Ghaziabad",
                                           "lat": 28.65, "lon": 77.36, "precision": "pincode"}})
    out = run(ss.solar_resource(db, pincode="201010"))
    assert out["status"] == "state_only" and out["reason"] == "solar_unavailable"
    assert out["location"]["state"] == "Uttar Pradesh"


def test_stale_cache_used_when_live_fails(monkeypatch):
    set_sources(monkeypatch, [make_src(0, fail=True)] * 5)
    db = FakeDB()
    old = (ss.now_utc() - timedelta(days=60)).isoformat()
    db.solar_cache.docs.append({"key": "26.90,75.80", "v": 3, "fetchedAt": old,
                                "data": {"avgDailyGHI": 5.4, "sourcesUsed": 3, "fetchedAt": old}})
    data, st = run(ss.get_solar(db, 26.9, 75.8))
    assert st == "stale" and data["avgDailyGHI"] == 5.4


def test_very_old_cache_not_used(monkeypatch):
    set_sources(monkeypatch, [make_src(0, fail=True)] * 5)
    db = FakeDB()
    old = (ss.now_utc() - timedelta(days=400)).isoformat()
    db.solar_cache.docs.append({"key": "26.90,75.80", "v": 3, "fetchedAt": old,
                                "data": {"avgDailyGHI": 5.4, "sourcesUsed": 3, "fetchedAt": old}})
    data, st = run(ss.get_solar(db, 26.9, 75.8))
    assert data is None and st is None


def test_fresh_cache_and_write(monkeypatch):
    set_sources(monkeypatch, [make_src(5.0), make_src(5.1), make_src(5.2), make_src(5.0), make_src(5.1)])
    db = FakeDB()
    d1, s1 = run(ss.get_solar(db, 26.9, 75.8))
    d2, s2 = run(ss.get_solar(db, 26.9, 75.8))
    assert s1 == "live" and s2 == "cached" and d1["avgDailyGHI"] == d2["avgDailyGHI"]


# ---- geocoder fallbacks ----
POST_UP = {"found": True, "district": "Ghaziabad", "districts": ["Ghaziabad"], "state": "Uttar Pradesh", "postOffices": ["X"]}


def pin_geo(name, state="Uttar Pradesh", lat=28.65, lon=77.36, fail=False):
    async def fn(*a):
        if fail:
            raise RuntimeError("down")
        return {"lat": lat, "lon": lon, "state": state, "district": "Ghaziabad", "geocoder": name, "precision": "pincode"}
    fn.__name__ = name
    return fn


def place_geo(name, ok=True):
    async def fn(q, expect, precision):
        if not ok:
            return None
        return {"lat": 28.66, "lon": 77.43, "state": "Uttar Pradesh", "district": "Ghaziabad", "name": "Ghaziabad",
                "geocoder": name, "precision": precision}
    return fn


def test_india_post_down_other_geocoders_resolve(monkeypatch):
    async def ip_fail(pin):
        raise RuntimeError("India Post down")
    monkeypatch.setattr(ss, "_india_post", ip_fail)
    monkeypatch.setattr(ss, "_nominatim_pin", pin_geo("nom", fail=True))
    monkeypatch.setattr(ss, "_photon_pin", pin_geo("photon"))
    monkeypatch.setattr(ss, "_zippopotam", pin_geo("zip"))
    loc = run(ss.resolve_pincode(FakeDB(), "201010"))
    assert loc["state"] == "Uttar Pradesh" and loc["geocoder"] == "photon" and loc["verifiedBy"] is None


def test_state_mismatch_rejected(monkeypatch):
    async def ip(pin):
        return POST_UP
    monkeypatch.setattr(ss, "_india_post", ip)
    monkeypatch.setattr(ss, "_nominatim_pin", pin_geo("nom", state="Maharashtra", lat=19.0, lon=72.8))
    monkeypatch.setattr(ss, "_photon_pin", pin_geo("photon", state="Bihar", lat=25.0, lon=85.0))
    monkeypatch.setattr(ss, "_openmeteo_place", place_geo("om", ok=False))
    monkeypatch.setattr(ss, "_photon_place", place_geo("pp", ok=False))
    monkeypatch.setattr(ss, "_zippopotam", pin_geo("zip", state="Uttar Pradesh"))
    loc = run(ss.resolve_pincode(FakeDB(), "201010"))
    assert loc["geocoder"] == "zip" and loc["state"] == "Uttar Pradesh"


# New order: Nominatim -> Photon -> district centre -> Zippopotam (last)
def test_district_centre_preferred_over_zippopotam(monkeypatch):
    async def ip(pin):
        return POST_UP
    monkeypatch.setattr(ss, "_india_post", ip)
    for n in ("_nominatim_pin", "_photon_pin"):
        monkeypatch.setattr(ss, n, pin_geo(n, fail=True))
    monkeypatch.setattr(ss, "_openmeteo_place", place_geo("om"))
    monkeypatch.setattr(ss, "_photon_place", place_geo("pp"))
    monkeypatch.setattr(ss, "_zippopotam", pin_geo("zip"))
    loc = run(ss.resolve_pincode(FakeDB(), "201010"))
    assert loc["geocoder"] == "om" and loc["precision"] == "district"


def test_unmappable_geocoder_state_rejected_when_post_known(monkeypatch):
    async def ip(pin):
        return POST_UP
    monkeypatch.setattr(ss, "_india_post", ip)
    monkeypatch.setattr(ss, "_nominatim_pin", pin_geo("nom", state="Atlantis Province"))
    monkeypatch.setattr(ss, "_photon_pin", pin_geo("photon", state="Uttar Pradesh"))
    loc = run(ss.resolve_pincode(FakeDB(), "201010"))
    assert loc["geocoder"] == "photon"
    assert ss._state_ok("Atlantis Province", "Uttar Pradesh") is False
    assert ss._state_ok(None, "Uttar Pradesh") is True


def test_real_zippopotam_precision_is_approximate(monkeypatch):
    async def fake_get(url, *a, **k):
        return {"places": [{"latitude": "28.6", "longitude": "77.4", "state": "Uttar Pradesh"}]}
    monkeypatch.setattr(ss, "_get_json", fake_get)
    out = run(ss._zippopotam("201010"))
    assert out["precision"] == "approximate" and out["geocoder"] == "Zippopotam.us"


def test_district_fallback(monkeypatch):
    async def ip(pin):
        return POST_UP
    monkeypatch.setattr(ss, "_india_post", ip)
    for n in ("_nominatim_pin", "_photon_pin", "_zippopotam"):
        monkeypatch.setattr(ss, n, pin_geo(n, fail=True))
    monkeypatch.setattr(ss, "_openmeteo_place", place_geo("om", ok=False))
    monkeypatch.setattr(ss, "_photon_place", place_geo("photon_place"))
    loc = run(ss.resolve_pincode(FakeDB(), "201010"))
    assert loc["precision"] == "district" and loc["geocoder"] == "photon_place"


def test_all_geocoders_fail_state_only(monkeypatch):
    async def ip(pin):
        return POST_UP
    monkeypatch.setattr(ss, "_india_post", ip)
    for n in ("_nominatim_pin", "_photon_pin", "_zippopotam"):
        monkeypatch.setattr(ss, n, pin_geo(n, fail=True))
    monkeypatch.setattr(ss, "_openmeteo_place", place_geo("om", ok=False))
    monkeypatch.setattr(ss, "_photon_place", place_geo("pp", ok=False))
    out = run(ss.solar_resource(FakeDB(), pincode="201010"))
    assert out["status"] == "state_only" and out["reason"] == "location_unresolved"
    assert out["location"]["state"] == "Uttar Pradesh"


def test_everything_down_503(monkeypatch):
    async def ip_fail(pin):
        raise RuntimeError("down")
    monkeypatch.setattr(ss, "_india_post", ip_fail)
    for n in ("_nominatim_pin", "_photon_pin", "_zippopotam"):
        monkeypatch.setattr(ss, n, pin_geo(n, fail=True))
    monkeypatch.setattr(ss, "_openmeteo_place", place_geo("om", ok=False))
    monkeypatch.setattr(ss, "_photon_place", place_geo("pp", ok=False))
    with pytest.raises(ss.SolarError) as e:
        run(ss.resolve_pincode(FakeDB(), "201010"))
    assert e.value.status == 503


def test_canon_state_aliases():
    assert ss.canon_state("Delhi") == "Delhi (NCT)"
    assert ss.canon_state("Andaman and Nicobar Islands") == "Andaman & Nicobar"
    assert ss.canon_state("Jammu and Kashmir") == "Jammu & Kashmir"
    assert ss.canon_state("The Dadra And Nagar Haveli And Daman And Diu") in (None, ss._DNH)
    assert ss.canon_state("Orissa") == "Odisha"
    assert ss.canon_state("") is None
