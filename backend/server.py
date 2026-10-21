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
import solar_service  # noqa: E402


@api_router.get("/solar/resource")
async def solar_resource(
    pincode: Optional[str] = None,
    city: Optional[str] = None,
    state: Optional[str] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
):
    """Pincode/city -> verified location -> cross-checked solar resource. Never 500s."""
    try:
        return await solar_service.solar_resource(db, pincode=pincode, city=city, state=state, lat=lat, lon=lon)
    except solar_service.SolarError as e:
        raise HTTPException(status_code=e.status, detail=e.message)
    except Exception as e:
        logger.exception(f"solar_resource failed: {e!r}")
        raise HTTPException(status_code=503, detail="Live solar data is temporarily unavailable. The calculator will use your state's average.")


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
    await solar_service.close_http()
    client.close()
