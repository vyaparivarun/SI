"""Location resolution + multi-source solar resource consensus (free, keyless public APIs)."""
import asyncio
import calendar
import logging
import re
import statistics
import time
import unicodedata
from collections import Counter
from datetime import datetime, timezone, timedelta

import httpx

logger = logging.getLogger("solar_service")

UA = "SolarIntelligence/1.0 (C&I solar savings calculator; pincode lookup)"
PIN_RE = re.compile(r"^[1-9][0-9]{5}$")
INDIA_BBOX = (6.0, 37.6, 68.0, 97.6)
GHI_RANGE = (2.5, 7.5)          # plausible annual-mean kWh/m²/day anywhere in India
OUTLIER_FRAC = 0.15             # drop a source >15% away from the median (when >=3 sources)
SUNNY_MAX_CLOUD = 40.0          # "sunny day" = daily mean cloud cover below 40%
MIN_VALID_DAYS = 300            # a 12-month series must have >=300 valid days
FRESH_DAYS, STALE_DAYS, GEO_DAYS = 14, 365, 90
MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]

STATE_NAMES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
    "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
    "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
    "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
    "Delhi (NCT)", "Jammu & Kashmir", "Ladakh", "Chandigarh", "Puducherry",
    "Dadra & Nagar Haveli and Daman & Diu", "Andaman & Nicobar",
]
_DNH = "Dadra & Nagar Haveli and Daman & Diu"
STATE_ALIASES = {
    "delhi": "Delhi (NCT)", "nctofdelhi": "Delhi (NCT)", "newdelhi": "Delhi (NCT)",
    "chattisgarh": "Chhattisgarh", "pondicherry": "Puducherry", "orissa": "Odisha",
    "uttaranchal": "Uttarakhand", "andamanandnicobarislands": "Andaman & Nicobar",
    "dadraandnagarhaveli": _DNH, "damananddiu": _DNH, "dadraandnagarhavelianddamananddiu": _DNH,
    "jammuandkashmir": "Jammu & Kashmir",
}
LADAKH_DISTRICTS = {"leh", "lehladakh", "kargil"}


class SolarError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status, self.message = status, message


def norm(s) -> str:
    s = unicodedata.normalize("NFKD", str(s or "")).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z]", "", s.lower().replace("&", "and"))


_STATE_BY_NORM = {norm(n): n for n in STATE_NAMES}


def canon_state(raw):
    k = norm(raw)
    return _STATE_BY_NORM.get(k) or STATE_ALIASES.get(k) if k else None


def now_utc():
    return datetime.now(timezone.utc)


# ----------------------------- HTTP -----------------------------
_client = None


def _http():
    global _client
    if _client is None:
        _client = httpx.AsyncClient(timeout=httpx.Timeout(20.0, connect=8.0),
                                    headers={"User-Agent": UA}, follow_redirects=True)
    return _client


async def close_http():
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None


async def _get_json(url, params=None, timeout=20.0, retries=1):
    """GET JSON with one retry on timeouts / 429 / 5xx. Client errors (4xx) are not retried."""
    last = None
    for attempt in range(retries + 1):
        try:
            r = await _http().get(url, params=params, timeout=timeout)
            if r.status_code == 429 or r.status_code >= 500:
                raise httpx.HTTPStatusError(f"HTTP {r.status_code}", request=r.request, response=r)
            r.raise_for_status()
            return r.json()
        except httpx.HTTPStatusError as e:
            last = e
            if e.response.status_code < 500 and e.response.status_code != 429:
                break
        except (httpx.TimeoutException, httpx.TransportError, ValueError) as e:
            last = e
        if attempt < retries:
            await asyncio.sleep(0.7 * (attempt + 1))
    raise last


def _in_india(lat, lon):
    return INDIA_BBOX[0] <= lat <= INDIA_BBOX[1] and INDIA_BBOX[2] <= lon <= INDIA_BBOX[3]


def _state_ok(cand_state, expect):
    if not expect or not cand_state:
        return True
    cs = canon_state(cand_state)
    return cs == expect or (expect == "Ladakh" and cs == "Jammu & Kashmir")


# ----------------------------- Geocoding -----------------------------
async def _india_post(pin):
    data = await _get_json(f"https://api.postalpincode.in/pincode/{pin}", timeout=10)
    rec = data[0] if isinstance(data, list) and data else {}
    pos = rec.get("PostOffice") or []
    if rec.get("Status") != "Success" or not pos:
        return {"found": False}
    districts = Counter(p.get("District") for p in pos if p.get("District"))
    states = Counter(p.get("State") for p in pos if p.get("State"))
    district = districts.most_common(1)[0][0] if districts else None
    state = canon_state(states.most_common(1)[0][0]) if states else None
    if norm(district) in LADAKH_DISTRICTS:
        state = "Ladakh"
    return {
        "found": True, "district": district, "districts": [d for d, _ in districts.most_common()],
        "state": state, "postOffices": [p.get("Name") for p in pos if p.get("Name")][:6],
    }


async def _nominatim_pin(pin):
    d = await _get_json("https://nominatim.openstreetmap.org/search",
                        {"postalcode": pin, "countrycodes": "in", "format": "jsonv2",
                         "addressdetails": 1, "limit": 1}, timeout=10)
    if not d:
        return None
    g, a = d[0], d[0].get("address") or {}
    return {"lat": float(g["lat"]), "lon": float(g["lon"]), "state": a.get("state"),
            "district": a.get("state_district") or a.get("county"),
            "geocoder": "OpenStreetMap Nominatim", "precision": "pincode"}


async def _photon_pin(pin):
    d = await _get_json("https://photon.komoot.io/api/", {"q": f"{pin} India", "limit": 5}, timeout=10)
    for f in d.get("features") or []:
        p = f.get("properties") or {}
        if p.get("countrycode") == "IN" and p.get("osm_value") == "postcode" and str(p.get("name")) == pin:
            lon, lat = f["geometry"]["coordinates"][:2]
            return {"lat": float(lat), "lon": float(lon), "state": p.get("state"), "district": p.get("county"),
                    "geocoder": "Photon (OpenStreetMap)", "precision": "pincode"}
    return None


async def _zippopotam(pin):
    d = await _get_json(f"https://api.zippopotam.us/IN/{pin}", timeout=8, retries=0)
    places = d.get("places") or []
    if not places:
        return None
    p = places[0]
    return {"lat": float(p["latitude"]), "lon": float(p["longitude"]), "state": p.get("state"),
            "district": None, "geocoder": "Zippopotam.us", "precision": "approximate"}


async def _openmeteo_place(name, expect_state, precision):
    d = await _get_json("https://geocoding-api.open-meteo.com/v1/search",
                        {"name": name, "count": 10, "language": "en", "countryCode": "IN"}, timeout=10)
    for g in d.get("results") or []:
        if expect_state and canon_state(g.get("admin1")) != expect_state:
            continue
        return {"lat": float(g["latitude"]), "lon": float(g["longitude"]), "state": g.get("admin1"),
                "district": g.get("admin2"), "name": g.get("name"),
                "geocoder": "Open-Meteo Geocoding (GeoNames)", "precision": precision}
    return None


async def _photon_place(query, expect_state, precision):
    d = await _get_json("https://photon.komoot.io/api/", {"q": f"{query}, India", "limit": 5}, timeout=10)
    for f in d.get("features") or []:
        p = f.get("properties") or {}
        if p.get("countrycode") != "IN" or (expect_state and canon_state(p.get("state")) != expect_state):
            continue
        lon, lat = f["geometry"]["coordinates"][:2]
        return {"lat": float(lat), "lon": float(lon), "state": p.get("state"), "district": p.get("county"),
                "name": p.get("name"), "geocoder": "Photon (OpenStreetMap)", "precision": precision}
    return None


async def _first_valid(calls, expect_state):
    for fn, args in calls:
        try:
            c = await fn(*args)
        except Exception as e:  # one geocoder failing must never break the lookup
            logger.info(f"geocoder {fn.__name__} failed: {e!r}")
            continue
        if c and _in_india(c["lat"], c["lon"]) and _state_ok(c.get("state"), expect_state):
            return c
    return None


_db_down_until = 0.0


def _db_usable(db) -> bool:
    return db is not None and time.monotonic() >= _db_down_until


def _db_failed(op: str, e: Exception):
    """Cache is optional: on any DB error skip it for 60 s so live data is never slowed or blocked."""
    global _db_down_until
    _db_down_until = time.monotonic() + 60
    logger.warning(f"cache {op} skipped (database unavailable): {e!r}")


async def cache_get(db, coll: str, query: dict):
    if not _db_usable(db):
        return None
    try:
        return await db[coll].find_one(query, {"_id": 0})
    except Exception as e:
        _db_failed("read", e)
        return None


async def cache_put(db, coll: str, query: dict, doc: dict):
    if not _db_usable(db):
        return
    try:
        await db[coll].update_one(query, {"$set": doc}, upsert=True)
    except Exception as e:
        _db_failed("write", e)


async def resolve_pincode(db, pin: str) -> dict:
    pin = (pin or "").strip()
    if not PIN_RE.match(pin):
        raise SolarError(422, "Please enter a valid 6-digit Indian pincode (e.g. 302001).")
    cached = await cache_get(db, "geo_cache", {"key": f"pin:{pin}"})
    if cached and now_utc() - datetime.fromisoformat(cached["fetchedAt"]) < timedelta(days=GEO_DAYS):
        return cached["location"]

    post = None
    try:
        post = await _india_post(pin)
    except Exception as e:
        logger.info(f"India Post lookup failed for {pin}: {e!r}")

    expect = post.get("state") if post and post.get("found") else None
    # Order = most precise first; Zippopotam's India coordinates are coarse, so it is the last resort.
    coords = await _first_valid([(_nominatim_pin, (pin,)), (_photon_pin, (pin,))], expect)
    if not coords and post and post.get("found"):
        calls = []
        for dist in post["districts"][:2]:
            calls += [(_openmeteo_place, (dist, expect, "district")),
                      (_photon_place, (f"{dist}, {expect}", expect, "district"))]
        coords = await _first_valid(calls, expect)
    if not coords:
        coords = await _first_valid([(_zippopotam, (pin,))], expect)

    if post is not None and not post.get("found") and not coords:
        raise SolarError(404, f"Pincode {pin} was not found in India Post records. Please check the number.")

    state = expect or canon_state((coords or {}).get("state"))
    district = (post or {}).get("district") or (coords or {}).get("district")
    if not coords and not state:
        raise SolarError(503, "We couldn't locate this pincode right now (location services did not respond). Please try again in a minute.")

    loc = {
        "pincode": pin, "state": state, "district": district,
        "districts": (post or {}).get("districts") or ([district] if district else []),
        "postOffices": (post or {}).get("postOffices") or [],
        "verifiedBy": "India Post" if post and post.get("found") else None,
        "label": ", ".join([x for x in [district, state] if x]) + f" · PIN {pin}",
    }
    if coords:
        loc.update({"lat": round(coords["lat"], 4), "lon": round(coords["lon"], 4),
                    "precision": coords["precision"], "geocoder": coords["geocoder"]})
        await cache_put(db, "geo_cache", {"key": f"pin:{pin}"},
                        {"key": f"pin:{pin}", "location": loc, "fetchedAt": now_utc().isoformat()})
    else:
        loc["precision"] = "state"
    return loc


async def resolve_city(city: str, state: str = None) -> dict:
    city = (city or "").strip()
    if len(city) < 2:
        raise SolarError(422, "Please enter a city or pincode.")
    expect = canon_state(state) if state else None
    coords = await _first_valid([(_openmeteo_place, (city, expect, "city")),
                                 (_photon_place, (f"{city}, {state}" if state else city, expect, "city"))], expect)
    if not coords and not expect:
        raise SolarError(404, f"We couldn't find '{city}'. Try your 6-digit pincode instead.")
    st = expect or canon_state(coords.get("state"))
    loc = {"city": city, "state": st, "district": (coords or {}).get("district"), "districts": [],
           "postOffices": [], "verifiedBy": None,
           "label": ", ".join([x for x in [(coords or {}).get("name") or city, st] if x])}
    if coords:
        loc.update({"lat": round(coords["lat"], 4), "lon": round(coords["lon"], 4),
                    "precision": "city", "geocoder": coords["geocoder"]})
    else:
        loc["precision"] = "state"
    return loc


# ----------------------------- Solar sources -----------------------------
def _window(end_lag_days):
    end = (now_utc() - timedelta(days=end_lag_days)).date()
    return end - timedelta(days=364), end


def _days_in(m):
    return calendar.monthrange(2023, m + 1)[1]


async def _src_gsa(lat, lon):
    d = await _get_json("https://api.globalsolaratlas.info/data/lta", {"loc": f"{lat:.4f},{lon:.4f}"})
    ann = ((d.get("annual") or {}).get("data") or {}).get("GHI")
    if not ann:
        return None
    mon = ((d.get("monthly") or {}).get("data") or {}).get("GHI")
    layer = (((d.get("annual") or {}).get("metadata") or {}).get("layers") or {}).get("GHI") or {}
    to = (layer.get("period") or {}).get("to")
    return {"avgDailyGHI": ann / 365.0,
            "monthly": [v / _days_in(i) for i, v in enumerate(mon)] if mon and len(mon) == 12 else None,
            "period": f"Long-term satellite average (to {to})" if to else "Long-term satellite average"}


async def _src_nasa_clim(lat, lon):
    d = await _get_json("https://power.larc.nasa.gov/api/temporal/climatology/point",
                        {"parameters": "ALLSKY_SFC_SW_DWN", "community": "RE", "latitude": round(lat, 3),
                         "longitude": round(lon, 3), "format": "JSON"}, timeout=25)
    p = (((d.get("properties") or {}).get("parameter") or {}).get("ALLSKY_SFC_SW_DWN")) or {}
    ann = p.get("ANN")
    if ann is None or ann < 0:
        return None
    mon = [p.get(k) for k in MONTHS]
    rng = re.search(r"\(([^)]+)\)", (d.get("header") or {}).get("range") or "")
    period = f"Long-term climatology ({rng.group(1)})" if rng else "Long-term climatology"
    return {"avgDailyGHI": float(ann), "monthly": mon if all(v is not None and v >= 0 for v in mon) else None,
            "period": period}


async def _src_pvgis(lat, lon):
    d = await _get_json("https://re.jrc.ec.europa.eu/api/v5_2/MRcalc",
                        {"lat": round(lat, 3), "lon": round(lon, 3), "horirrad": 1, "outputformat": "json"}, timeout=25)
    rows = ((d.get("outputs") or {}).get("monthly")) or []
    if not rows:
        return None
    per_year, per_month = {}, {m: [] for m in range(12)}
    for r in rows:
        v = r.get("H(h)_m")
        if v is None:
            continue
        per_year[r["year"]] = per_year.get(r["year"], 0.0) + v
        per_month[r["month"] - 1].append(v / _days_in(r["month"] - 1))
    full_years = [v for y, v in per_year.items() if sum(1 for r in rows if r["year"] == y) == 12]
    if not full_years:
        return None
    meta = (d.get("inputs") or {}).get("meteo_data") or {}
    db_name = meta.get("radiation_db") or "PVGIS"
    return {"avgDailyGHI": statistics.mean(full_years) / 365.0,
            "monthly": [statistics.mean(per_month[m]) if per_month[m] else None for m in range(12)],
            "period": f"{db_name} {meta.get('year_min', '')}–{meta.get('year_max', '')}".strip()}


def _sunny_per_year(clouds):
    return round(sum(1 for c in clouds if c < SUNNY_MAX_CLOUD) * 365 / len(clouds))


async def _src_om_era5(lat, lon):
    start, end = _window(7)
    d = await _get_json("https://archive-api.open-meteo.com/v1/archive",
                        {"latitude": round(lat, 3), "longitude": round(lon, 3), "start_date": start.isoformat(),
                         "end_date": end.isoformat(), "daily": "shortwave_radiation_sum,cloud_cover_mean",
                         "timezone": "auto"}, timeout=25)
    daily = d.get("daily") or {}
    rad = [x for x in (daily.get("shortwave_radiation_sum") or []) if x is not None]
    if len(rad) < MIN_VALID_DAYS:
        return None
    cc = [x for x in (daily.get("cloud_cover_mean") or []) if x is not None]
    return {"avgDailyGHI": statistics.mean(rad) / 3.6, "period": f"Last 12 months ({start} → {end})",
            "sunnyDays": _sunny_per_year(cc) if len(cc) >= MIN_VALID_DAYS else None}


async def _src_nasa_daily(lat, lon):
    start, end = _window(85)  # NASA cloud product lags ~2.5 months; keep the 12-month series complete
    d = await _get_json("https://power.larc.nasa.gov/api/temporal/daily/point",
                        {"parameters": "ALLSKY_SFC_SW_DWN,CLOUD_AMT", "community": "RE",
                         "latitude": round(lat, 3), "longitude": round(lon, 3),
                         "start": start.strftime("%Y%m%d"), "end": end.strftime("%Y%m%d"), "format": "JSON"}, timeout=30)
    p = ((d.get("properties") or {}).get("parameter")) or {}
    ghi = [v for v in (p.get("ALLSKY_SFC_SW_DWN") or {}).values() if v is not None and v >= 0]
    if len(ghi) < MIN_VALID_DAYS:
        return None
    cc = [v for v in (p.get("CLOUD_AMT") or {}).values() if v is not None and v >= 0]
    return {"avgDailyGHI": statistics.mean(ghi), "period": f"Last 12 months ({start} → {end})",
            "sunnyDays": _sunny_per_year(cc) if len(cc) >= MIN_VALID_DAYS else None}


SOURCES = [
    ("gsa", "Global Solar Atlas (World Bank · Solargis)", _src_gsa),
    ("nasa_clim", "NASA POWER climatology", _src_nasa_clim),
    ("pvgis", "PVGIS (EU Joint Research Centre)", _src_pvgis),
    ("om_era5", "Open-Meteo ERA5 reanalysis", _src_om_era5),
    ("nasa_daily", "NASA POWER daily", _src_nasa_daily),
]


async def _run_source(sid, name, fn, lat, lon):
    try:
        res = await asyncio.wait_for(fn(lat, lon), timeout=40)
        if not res:
            return {"id": sid, "name": name, "ok": False, "note": "No usable data for this location"}
        return {"id": sid, "name": name, "ok": True, **res}
    except Exception as e:
        logger.info(f"solar source {sid} failed: {e!r}")
        return {"id": sid, "name": name, "ok": False, "note": "Service did not respond"}


async def fetch_solar(lat: float, lon: float):
    results = await asyncio.gather(*[_run_source(sid, n, fn, lat, lon) for sid, n, fn in SOURCES])
    ok = [r for r in results if r["ok"]]
    for r in ok:
        r["avgDailyGHI"] = round(r["avgDailyGHI"], 2)
        r["used"] = GHI_RANGE[0] <= r["avgDailyGHI"] <= GHI_RANGE[1]
        if not r["used"]:
            r["note"] = "Excluded — outside the plausible range for India"
    valid = [r for r in ok if r["used"]]
    if not valid:
        return None
    med = statistics.median(r["avgDailyGHI"] for r in valid)
    if len(valid) >= 3:
        for r in valid:
            dev = (r["avgDailyGHI"] - med) / med
            if abs(dev) > OUTLIER_FRAC:
                r["used"], r["note"] = False, f"Excluded as outlier ({dev * 100:+.0f}% vs other sources)"
    kept = [r for r in ok if r["used"]]
    consensus = round(statistics.median(r["avgDailyGHI"] for r in kept), 2)
    spread = (max(r["avgDailyGHI"] for r in kept) - min(r["avgDailyGHI"] for r in kept)) / consensus * 100
    if len(kept) >= 3 and spread <= 12:
        confidence = "high"
    elif len(kept) >= 2 and spread <= 25:
        confidence = "medium"
    else:
        confidence = "low"

    sunny = [(r["name"], r["sunnyDays"]) for r in ok if r.get("sunnyDays") is not None]
    monthly = []
    for m in range(12):
        vals = [r["monthly"][m] for r in kept if r.get("monthly") and r["monthly"][m] is not None]
        monthly.append(round(statistics.median(vals), 2) if vals else None)

    sources = [{"id": r["id"], "name": r["name"], "period": r.get("period"), "avgDailyGHI": r.get("avgDailyGHI"),
                "used": bool(r.get("used")), "ok": r["ok"], "note": r.get("note")} for r in results]
    return {
        "avgDailyGHI": consensus,
        "annualGHI": round(consensus * 365),
        "confidence": confidence,
        "spreadPct": round(spread, 1),
        "sourcesUsed": len(kept),
        "sourcesTried": len(results),
        "method": f"Median of {len(kept)} agreeing source{'s' if len(kept) != 1 else ''}",
        "sources": sources,
        "sunnyDays": round(statistics.median(v for _, v in sunny)) if sunny else None,
        "sunnyDaysRange": [min(v for _, v in sunny), max(v for _, v in sunny)] if sunny else None,
        "sunnyDaysBySource": [{"name": n, "sunnyDays": v} for n, v in sunny],
        "sunnyDayMaxCloudPct": SUNNY_MAX_CLOUD,
        "monthlyGHI": monthly if any(v is not None for v in monthly) else None,
        "fetchedAt": now_utc().isoformat(),
    }


async def get_solar(db, lat: float, lon: float):
    """Returns (data, cacheStatus) — prefers fresh cache, then live, then stale cache."""
    key = f"{lat:.2f},{lon:.2f}"
    cached = await cache_get(db, "solar_cache", {"key": key, "v": 4})
    age = now_utc() - datetime.fromisoformat(cached["fetchedAt"]) if cached else None
    if cached and age < timedelta(days=FRESH_DAYS):
        return cached["data"], "cached"
    live = await fetch_solar(lat, lon)
    if live and live["sourcesUsed"] >= 2:
        await cache_put(db, "solar_cache", {"key": key, "v": 4},
                        {"key": key, "v": 4, "data": live, "fetchedAt": live["fetchedAt"]})
        return live, "live"
    if cached and age < timedelta(days=STALE_DAYS) and cached["data"].get("sourcesUsed", 0) >= 2:
        return cached["data"], "stale"
    return (live, "live") if live else (None, None)


async def solar_resource(db, pincode=None, city=None, state=None, lat=None, lon=None) -> dict:
    if lat is not None and lon is not None:
        if not _in_india(lat, lon):
            raise SolarError(422, "Coordinates are outside India.")
        loc = {"lat": round(lat, 4), "lon": round(lon, 4), "precision": "coordinates", "state": canon_state(state),
               "districts": [], "postOffices": [], "label": f"{lat:.3f}, {lon:.3f}"}
    elif pincode:
        loc = await resolve_pincode(db, pincode)
    elif city:
        loc = await resolve_city(city, state)
    else:
        raise SolarError(422, "Please enter a pincode or city.")

    if loc.get("lat") is None:
        return {"status": "state_only", "reason": "location_unresolved", "location": loc,
                "message": f"We confirmed this pincode is in {loc['state']}, but couldn't pin its exact location right now."}

    data, cache_status = await get_solar(db, loc["lat"], loc["lon"])
    if not data:
        return {"status": "state_only", "reason": "solar_unavailable", "location": loc,
                "message": "Satellite solar-data services didn't respond right now."}
    return {**data, "status": cache_status, "location": loc}
