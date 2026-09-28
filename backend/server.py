from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
import random
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Solar Intelligence Platform API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ----------------------------- Models -----------------------------
def now_iso():
    return datetime.now(timezone.utc).isoformat()


class LeadResult(BaseModel):
    """Computed solar opportunity summary attached to a lead (from engine)."""
    model_config = ConfigDict(extra="allow")
    recommendedCapacityKw: Optional[float] = None
    projectCost: Optional[float] = None
    loanAmount: Optional[float] = None
    emi: Optional[float] = None
    annualSavings: Optional[float] = None
    netMonthlyBenefit: Optional[float] = None
    paybackYears: Optional[float] = None
    projectIrr: Optional[float] = None
    lifetimeSavings: Optional[float] = None
    co2AvoidedTonnes: Optional[float] = None
    suitabilityScore: Optional[float] = None


class LeadCreate(BaseModel):
    model_config = ConfigDict(extra="allow")
    name: str
    company: Optional[str] = None
    mobile: str
    email: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    discom: Optional[str] = None
    industry: Optional[str] = None
    monthlyBill: Optional[float] = None
    projectSizeKw: Optional[float] = None
    loanRequirement: Optional[float] = None
    source: str = "calculator"          # calculator | epc | sales | contact
    epcId: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    inputs: Optional[Dict[str, Any]] = None


class Lead(LeadCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    leadId: str
    intent: str = "MEDIUM"
    score: int = 0
    status: str = "New"
    createdAt: str = Field(default_factory=now_iso)


class EPCRegister(BaseModel):
    model_config = ConfigDict(extra="allow")
    companyName: str
    contactPerson: Optional[str] = None
    mobile: str
    email: Optional[str] = None
    gstin: Optional[str] = None
    yearsInBusiness: Optional[float] = None
    statesServed: Optional[List[str]] = None
    annualInstallations: Optional[str] = None
    typicalProjectSize: Optional[str] = None
    moduleBrands: Optional[str] = None
    inverterBrands: Optional[str] = None
    projectsCompleted: Optional[str] = None


class EPCProjectCreate(BaseModel):
    model_config = ConfigDict(extra="allow")
    epcId: Optional[str] = None
    epcCompany: Optional[str] = None
    customerName: str
    industry: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    discom: Optional[str] = None
    monthlyBill: Optional[float] = None
    monthlyUnits: Optional[float] = None
    sanctionedLoad: Optional[float] = None
    solarCapacityKw: Optional[float] = None
    projectCost: Optional[float] = None
    customerContribution: Optional[float] = None
    loanRequirement: Optional[float] = None
    projectModel: Optional[str] = None
    commissioningDate: Optional[str] = None
    result: Optional[Dict[str, Any]] = None


# ----------------------------- Helpers -----------------------------
def compute_intent(bill: Optional[float], loan: Optional[float]) -> (str, int):
    """Lead scoring based on monthly bill and financing requirement."""
    b = bill or 0
    score = 0
    if b >= 1_000_000:
        score += 45
    elif b >= 500_000:
        score += 35
    elif b >= 200_000:
        score += 22
    elif b >= 75_000:
        score += 12
    else:
        score += 5
    if (loan or 0) > 0:
        score += 20
    if b >= 300_000:
        score += 15
    score = min(score, 100)
    if score >= 60:
        intent = "HIGH"
    elif score >= 35:
        intent = "MEDIUM"
    else:
        intent = "LOW"
    return intent, score


def gen_id(prefix: str) -> str:
    return f"{prefix}-{datetime.now().strftime('%y%m')}-{random.randint(1000, 9999)}"


# ----------------------------- Routes -----------------------------
@api_router.get("/")
async def root():
    return {"message": "Solar Intelligence Platform API", "status": "ok"}


@api_router.post("/leads", response_model=Lead)
async def create_lead(payload: LeadCreate):
    intent, score = compute_intent(payload.monthlyBill, payload.loanRequirement)
    lead = Lead(
        **payload.model_dump(),
        leadId=gen_id("SI-LEAD"),
        intent=intent,
        score=score,
    )
    await db.leads.insert_one(lead.model_dump())
    return lead


@api_router.get("/leads", response_model=List[Lead])
async def list_leads():
    docs = await db.leads.find({}, {"_id": 0}).sort("createdAt", -1).to_list(500)
    return docs


@api_router.get("/leads/{lead_id}")
async def get_lead(lead_id: str):
    doc = await db.leads.find_one({"leadId": lead_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Lead not found")
    return doc


@api_router.post("/epc/register")
async def register_epc(payload: EPCRegister):
    epc_id = gen_id("SI-EPC")
    doc = {"id": str(uuid.uuid4()), "epcId": epc_id, "status": "Active",
           "createdAt": now_iso(), **payload.model_dump()}
    await db.epc_partners.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.get("/epc/partners")
async def list_epc():
    docs = await db.epc_partners.find({}, {"_id": 0}).sort("createdAt", -1).to_list(500)
    return docs


@api_router.post("/epc/projects")
async def submit_project(payload: EPCProjectCreate):
    intent, score = compute_intent(payload.monthlyBill, payload.loanRequirement)
    project_id = gen_id("SI-PRJ")
    stages = ["Submitted", "Under Review", "Documents Pending", "Credit Evaluation",
              "Approved", "Disbursed"]
    doc = {
        "id": str(uuid.uuid4()),
        "projectId": project_id,
        "stage": "Submitted",
        "stages": stages,
        "intent": intent,
        "score": score,
        "status": "Submitted",
        "createdAt": now_iso(),
        **payload.model_dump(),
    }
    await db.epc_projects.insert_one(doc)
    doc.pop("_id", None)
    # Also create a financing lead
    intent2, score2 = compute_intent(payload.monthlyBill, payload.loanRequirement)
    lead = Lead(
        name=payload.customerName,
        company=payload.epcCompany,
        mobile="",
        state=payload.state,
        city=payload.city,
        discom=payload.discom,
        industry=payload.industry,
        monthlyBill=payload.monthlyBill,
        projectSizeKw=payload.solarCapacityKw,
        loanRequirement=payload.loanRequirement,
        source="epc",
        epcId=payload.epcId,
        result=payload.result,
        leadId=gen_id("SI-LEAD"),
        intent=intent2,
        score=score2,
    )
    await db.leads.insert_one(lead.model_dump())
    return doc


@api_router.get("/epc/projects")
async def list_projects(epcId: Optional[str] = None):
    q = {"epcId": epcId} if epcId else {}
    docs = await db.epc_projects.find(q, {"_id": 0}).sort("createdAt", -1).to_list(500)
    return docs


@api_router.get("/epc/projects/{project_id}")
async def get_project(project_id: str):
    doc = await db.epc_projects.find_one({"projectId": project_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found")
    return doc


@api_router.get("/stats")
async def platform_stats():
    leads = await db.leads.count_documents({})
    projects = await db.epc_projects.count_documents({})
    partners = await db.epc_partners.count_documents({})
    return {"leads": leads, "projects": projects, "partners": partners}


# --------------------- Solar resource (multi-source) ---------------------
# Resolves a location (pincode / city+state / lat+lon) and cross-checks the
# solar resource across THREE free, keyless, authoritative sources:
#   - Open-Meteo Historical Archive (ERA5, last ~12 months) -> GHI + cloud cover
#   - NASA POWER (long-term climatology)                    -> GHI
#   - PVGIS / EU-JRC (SARAH satellite climatology)          -> GHI
# The reported avgDailyGHI is the MEDIAN of available sources; each source is
# returned for transparency. "Sunny days" = days with mean cloud cover < 40%.
# Geocoding: Zippopotam.us (IN pincode) with Open-Meteo Geocoding fallback.
# Results are cached in Mongo (by rounded lat/lon) to avoid repeat calls.
import asyncio  # noqa: E402
import statistics  # noqa: E402
import httpx  # noqa: E402
from datetime import timedelta  # noqa: E402

SUNNY_DAY_MAX_CLOUD = 40.0       # a day is "sunny" if mean cloud cover < 40%
SOLAR_CACHE_TTL_DAYS = 14


async def _geocode_pincode(pincode: str):
    url = f"https://api.zippopotam.us/IN/{pincode}"
    async with httpx.AsyncClient(timeout=12) as cx:
        r = await cx.get(url)
        if r.status_code != 200:
            return None
        data = r.json()
        places = data.get("places") or []
        if not places:
            return None
        p = places[0]
        return {
            "lat": float(p["latitude"]),
            "lon": float(p["longitude"]),
            "label": f"{p.get('place name','')}, {p.get('state','')} {pincode}".strip(),
        }


async def _geocode_city(name: str, country_code: str = "IN"):
    url = "https://geocoding-api.open-meteo.com/v1/search"
    params = {"name": name, "count": 1, "language": "en", "countryCode": country_code}
    async with httpx.AsyncClient(timeout=12) as cx:
        r = await cx.get(url, params=params)
        if r.status_code != 200:
            return None
        results = (r.json() or {}).get("results") or []
        if not results:
            return None
        g = results[0]
        label = ", ".join([x for x in [g.get("name"), g.get("admin1"), g.get("country")] if x])
        return {"lat": float(g["latitude"]), "lon": float(g["longitude"]), "label": label}


async def _src_openmeteo(lat: float, lon: float):
    """Open-Meteo ERA5 archive — last ~12 months. Also gives cloud cover & sunshine."""
    end = (datetime.now(timezone.utc) - timedelta(days=6)).date()
    start = end - timedelta(days=364)
    url = "https://archive-api.open-meteo.com/v1/archive"
    params = {
        "latitude": round(lat, 3), "longitude": round(lon, 3),
        "start_date": start.isoformat(), "end_date": end.isoformat(),
        "daily": "shortwave_radiation_sum,sunshine_duration,cloud_cover_mean",
        "timezone": "auto",
    }
    async with httpx.AsyncClient(timeout=30) as cx:
        r = await cx.get(url, params=params)
        r.raise_for_status()
        daily = (r.json() or {}).get("daily") or {}
    rad = [x for x in (daily.get("shortwave_radiation_sum") or []) if x is not None]
    if not rad:
        return None
    ghi_vals = [x / 3.6 for x in rad]  # MJ/m2/day -> kWh/m2/day
    total_days = len(rad)
    cc = [x for x in (daily.get("cloud_cover_mean") or []) if x is not None]
    sun_h = [s / 3600.0 for s in (daily.get("sunshine_duration") or []) if s is not None]
    sunny = sum(1 for c in cc if c < SUNNY_DAY_MAX_CLOUD) if cc else None
    sunny_year = round(sunny * 365 / len(cc)) if cc else None
    return {
        "name": "Open-Meteo (ERA5, last 12 mo)",
        "avgDailyGHI": round(statistics.mean(ghi_vals), 2),
        "avgSunshineHours": round(statistics.mean(sun_h), 1) if sun_h else None,
        "sunnyDays": sunny_year,
        "totalDays": total_days,
        "periodStart": start.isoformat(),
        "periodEnd": end.isoformat(),
    }


async def _src_nasa(lat: float, lon: float):
    """NASA POWER climatology — long-term average GHI (kWh/m2/day)."""
    url = "https://power.larc.nasa.gov/api/temporal/climatology/point"
    params = {"parameters": "ALLSKY_SFC_SW_DWN", "community": "RE",
              "longitude": round(lon, 3), "latitude": round(lat, 3), "format": "JSON"}
    async with httpx.AsyncClient(timeout=30) as cx:
        r = await cx.get(url, params=params)
        r.raise_for_status()
        d = (((r.json() or {}).get("properties") or {}).get("parameter") or {}).get("ALLSKY_SFC_SW_DWN") or {}
    ann = d.get("ANN")
    if ann is None or ann < 0:
        return None
    return {"name": "NASA POWER (climatology)", "avgDailyGHI": round(float(ann), 2)}


async def _src_pvgis(lat: float, lon: float):
    """PVGIS / EU-JRC (SARAH satellite) — monthly horizontal irradiation."""
    url = "https://re.jrc.ec.europa.eu/api/v5_2/MRcalc"
    params = {"lat": round(lat, 3), "lon": round(lon, 3), "horirrad": 1, "outputformat": "json"}
    async with httpx.AsyncClient(timeout=30) as cx:
        r = await cx.get(url, params=params)
        r.raise_for_status()
        monthly = (((r.json() or {}).get("outputs") or {}).get("monthly") or [])
    if not monthly:
        return None
    per_year = {}
    for m in monthly:
        per_year[m.get("year")] = per_year.get(m.get("year"), 0.0) + (m.get("H(h)_m") or 0.0)
    if not per_year:
        return None
    annual = statistics.mean(per_year.values())  # kWh/m2/yr
    return {"name": "PVGIS (SARAH satellite)", "avgDailyGHI": round(annual / 365.0, 2)}


async def _fetch_solar(lat: float, lon: float):
    results = await asyncio.gather(
        _src_openmeteo(lat, lon), _src_nasa(lat, lon), _src_pvgis(lat, lon),
        return_exceptions=True,
    )
    sources, om = [], None
    for res in results:
        if isinstance(res, Exception) or res is None:
            continue
        if res["name"].startswith("Open-Meteo"):
            om = res
        sources.append({"name": res["name"], "avgDailyGHI": res["avgDailyGHI"]})
    if not sources:
        return None
    ghis = [s["avgDailyGHI"] for s in sources]
    consensus = round(statistics.median(ghis), 2)
    return {
        "avgDailyGHI": consensus,
        "sunnyDays": (om or {}).get("sunnyDays"),
        "avgSunshineHours": (om or {}).get("avgSunshineHours"),
        "sunnyDayMaxCloudPct": SUNNY_DAY_MAX_CLOUD,
        "totalDaysAnalyzed": (om or {}).get("totalDays"),
        "periodStart": (om or {}).get("periodStart"),
        "periodEnd": (om or {}).get("periodEnd"),
        "sources": sources,
        "method": f"Median of {len(sources)} source(s)",
    }


@api_router.get("/solar/resource")
async def solar_resource(
    pincode: Optional[str] = None,
    city: Optional[str] = None,
    state: Optional[str] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
):
    loc = None
    if lat is not None and lon is not None:
        loc = {"lat": lat, "lon": lon, "label": f"{round(lat,3)}, {round(lon,3)}"}
    elif pincode:
        loc = await _geocode_pincode(pincode.strip())
        if not loc:
            loc = await _geocode_city(pincode.strip())
        if not loc:
            raise HTTPException(status_code=404, detail="Could not resolve that pincode — using state average instead.")
    elif city:
        query = f"{city},{state}" if state else city
        loc = await _geocode_city(query)
        if not loc:
            raise HTTPException(status_code=404, detail="Could not resolve that city — using state average instead.")
    else:
        raise HTTPException(status_code=400, detail="Provide a pincode, city, or lat/lon.")

    key = f"{round(loc['lat'],2)},{round(loc['lon'],2)}"
    cached = await db.solar_cache.find_one({"key": key}, {"_id": 0})
    if cached:
        try:
            fetched = datetime.fromisoformat(cached.get("fetchedAt"))
            if datetime.now(timezone.utc) - fetched < timedelta(days=SOLAR_CACHE_TTL_DAYS):
                out = cached["data"]
                out["location"] = loc
                out["cached"] = True
                return out
        except Exception:
            pass

    try:
        data = await _fetch_solar(loc["lat"], loc["lon"])
    except Exception as e:
        logger.warning(f"Solar sources failed: {e}")
        raise HTTPException(status_code=502, detail="Solar data services are temporarily unavailable. Please try again.")
    if not data:
        raise HTTPException(status_code=502, detail="No solar data available for this location.")

    await db.solar_cache.update_one(
        {"key": key},
        {"$set": {"key": key, "data": data, "fetchedAt": now_iso()}},
        upsert=True,
    )
    data["location"] = loc
    data["cached"] = False
    return data


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
