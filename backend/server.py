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


# --------------------- Solar resource (Open-Meteo) ---------------------
# Resolves a location (pincode / city+state / lat+lon) to real solar resource
# using free, keyless public APIs:
#   - Zippopotam.us (India pincode -> lat/lon)
#   - Open-Meteo Geocoding (city name -> lat/lon)
#   - Open-Meteo Historical Archive (last ~12 months daily sunshine + GHI)
# Results are cached in Mongo (by rounded lat/lon) to avoid repeat calls.
import httpx  # noqa: E402
from datetime import timedelta  # noqa: E402

SUNNY_DAY_MIN_HOURS = 5.0        # a day is "productive/sunny" if >= 5 sunshine hours
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


async def _fetch_archive(lat: float, lon: float):
    end = (datetime.now(timezone.utc) - timedelta(days=6)).date()
    start = end - timedelta(days=364)
    url = "https://archive-api.open-meteo.com/v1/archive"
    params = {
        "latitude": round(lat, 3), "longitude": round(lon, 3),
        "start_date": start.isoformat(), "end_date": end.isoformat(),
        "daily": "sunshine_duration,shortwave_radiation_sum",
        "timezone": "auto",
    }
    async with httpx.AsyncClient(timeout=25) as cx:
        r = await cx.get(url, params=params)
        if r.status_code != 200:
            return None
        daily = (r.json() or {}).get("daily") or {}
        sun = daily.get("sunshine_duration") or []
        rad = daily.get("shortwave_radiation_sum") or []
        sun = [s for s in sun if s is not None]
        rad = [x for x in rad if x is not None]
        if not rad:
            return None
        total_days = len(rad)
        # shortwave_radiation_sum is MJ/m2/day -> kWh/m2/day = /3.6
        ghi_vals = [x / 3.6 for x in rad]
        avg_ghi = sum(ghi_vals) / len(ghi_vals)
        sun_hours = [s / 3600.0 for s in sun]
        avg_sun_hours = (sum(sun_hours) / len(sun_hours)) if sun_hours else None
        sunny_days = sum(1 for h in sun_hours if h >= SUNNY_DAY_MIN_HOURS)
        # scale sunny-day count to a full 365-day year for clarity
        sunny_days_year = round(sunny_days * 365 / total_days) if total_days else sunny_days
        return {
            "avgDailyGHI": round(avg_ghi, 2),
            "avgSunshineHours": round(avg_sun_hours, 1) if avg_sun_hours is not None else None,
            "sunnyDays": sunny_days_year,
            "totalDaysAnalyzed": total_days,
            "periodStart": start.isoformat(),
            "periodEnd": end.isoformat(),
            "sunnyDayThresholdHours": SUNNY_DAY_MIN_HOURS,
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
            raise HTTPException(status_code=404, detail="Could not resolve that pincode. Try a city name.")
    elif city:
        query = f"{city},{state}" if state else city
        loc = await _geocode_city(query)
        if not loc:
            raise HTTPException(status_code=404, detail="Could not resolve that city. Try a pincode.")
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
        data = await _fetch_archive(loc["lat"], loc["lon"])
    except Exception as e:
        logger.warning(f"Open-Meteo archive failed: {e}")
        raise HTTPException(status_code=502, detail="Weather service is temporarily unavailable. Please try again.")
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

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
