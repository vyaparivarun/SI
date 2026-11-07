"""Phone-OTP login (Twilio Verify), admin login, per-user activity + bill storage, admin panel APIs."""
import os
import re
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Optional

import bcrypt
import httpx
import jwt
from bson import ObjectId
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from fastapi.responses import Response
from motor.motor_asyncio import AsyncIOMotorGridFSBucket
from pydantic import BaseModel, Field

JWT_ALG = "HS256"
PHONE_RE = re.compile(r"^[6-9]\d{9}$")
MAX_BILL_BYTES = 4 * 1024 * 1024
BILL_TYPES = {"application/pdf", "image/jpeg", "image/png", "image/webp"}
ACTIVITY_KINDS = {"savings_calc", "loan_calc"}


def now():
    return datetime.now(timezone.utc)


def iso(dt=None):
    return (dt or now()).isoformat()


def jwt_secret():
    s = os.environ.get("JWT_SECRET")
    if not s:
        raise HTTPException(503, "Login is not configured on this server (JWT_SECRET missing).")
    return s


def make_token(sub: str, role: str, hours: int) -> str:
    payload = {"sub": sub, "role": role, "type": "access", "exp": now() + timedelta(hours=hours)}
    return jwt.encode(payload, jwt_secret(), algorithm=JWT_ALG)


def norm_phone(raw: str) -> str:
    digits = re.sub(r"\D", "", raw or "")
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    if len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]
    if not PHONE_RE.match(digits):
        raise HTTPException(422, "Enter a valid 10-digit Indian mobile number.")
    return digits


def test_numbers() -> Dict[str, str]:
    out = {}
    for pair in (os.environ.get("OTP_TEST_NUMBERS") or "").split(","):
        if ":" in pair:
            p, c = pair.split(":", 1)
            out[p.strip()] = c.strip()
    return out


def twilio_conf():
    sid, tok, svc = (os.environ.get(k) for k in ("TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_VERIFY_SERVICE"))
    if not (sid and tok and svc):
        raise HTTPException(503, "SMS login isn't switched on yet. Please try again later.")
    return sid, tok, svc


async def twilio_post(path: str, data: dict) -> dict:
    sid, tok, svc = twilio_conf()
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.post(f"https://verify.twilio.com/v2/Services/{svc}/{path}", data=data, auth=(sid, tok))
    except httpx.HTTPError:
        raise HTTPException(503, "Couldn't reach the SMS service. Please try again in a minute.")
    if r.status_code == 404 and path == "VerificationCheck":
        return {"status": "expired"}
    if r.status_code == 429:
        raise HTTPException(429, "Too many OTP requests for this number. Please wait a few minutes.")
    if r.status_code >= 400:
        raise HTTPException(502, "The SMS service rejected this request. Check the number and try again.")
    return r.json()


def bearer(request: Request) -> Optional[dict]:
    h = request.headers.get("Authorization", "")
    if not h.startswith("Bearer "):
        return None
    try:
        p = jwt.decode(h[7:], jwt_secret(), algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Your session has expired. Please log in again.")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Please log in again.")
    return p if p.get("type") == "access" else None


class SendOtpIn(BaseModel):
    phone: str
    name: str = Field(min_length=2, max_length=80)


class VerifyOtpIn(SendOtpIn):
    code: str = Field(min_length=4, max_length=8)


class AdminLoginIn(BaseModel):
    email: str
    password: str


class ActivityIn(BaseModel):
    kind: str
    title: str = Field(default="", max_length=160)
    inputs: Dict[str, Any] = {}
    summary: Dict[str, Any] = {}


def build_routers(get_db):
    public = APIRouter(prefix="/api")
    secured = APIRouter(prefix="/api")

    async def current_user(request: Request) -> dict:
        p = bearer(request)
        if not p:
            raise HTTPException(401, "Please log in to continue.")
        db = get_db()
        if p["role"] == "admin":
            return {"id": p["sub"], "role": "admin", "name": "Admin", "phone": ""}
        u = await db.users.find_one({"id": p["sub"]}, {"_id": 0})
        if not u:
            raise HTTPException(401, "Please log in again.")
        return u

    async def current_admin(request: Request) -> dict:
        p = bearer(request)
        if not p or p.get("role") != "admin":
            raise HTTPException(401, "Admin login required.")
        return {"email": p["sub"]}

    # ---------------- phone OTP ----------------
    @public.post("/auth/otp/send")
    async def send_otp(body: SendOtpIn, request: Request):
        db = get_db()
        phone = norm_phone(body.phone)
        since = iso(now() - timedelta(hours=1))
        ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "").split(",")[0].strip()
        if await db.otp_requests.count_documents({"phone": phone, "at": {"$gte": since}}) >= 5:
            raise HTTPException(429, "Too many OTP requests for this number. Please try again in an hour.")
        if ip and await db.otp_requests.count_documents({"ip": ip, "at": {"$gte": since}}) >= 20:
            raise HTTPException(429, "Too many OTP requests from this network. Please try again later.")
        await db.otp_requests.insert_one({"phone": phone, "ip": ip, "at": iso()})
        if phone not in test_numbers():
            await twilio_post("Verifications", {"To": f"+91{phone}", "Channel": "sms"})
        return {"sent": True, "phone": f"+91 {phone[:5]} {phone[5:]}"}

    @public.post("/auth/otp/verify")
    async def verify_otp(body: VerifyOtpIn):
        db = get_db()
        phone = norm_phone(body.phone)
        since = iso(now() - timedelta(minutes=15))
        if await db.otp_failures.count_documents({"phone": phone, "at": {"$gte": since}}) >= 5:
            raise HTTPException(429, "Too many wrong codes. Please wait 15 minutes and request a new OTP.")
        tests = test_numbers()
        ok = (tests[phone] == body.code.strip()) if phone in tests else \
            (await twilio_post("VerificationCheck", {"To": f"+91{phone}", "Code": body.code.strip()})).get("status") == "approved"
        if not ok:
            await db.otp_failures.insert_one({"phone": phone, "at": iso()})
            raise HTTPException(400, "That code is incorrect or has expired.")
        await db.otp_failures.delete_many({"phone": phone})
        name = body.name.strip()
        existing = await db.users.find_one({"phone": phone}, {"_id": 0})
        if existing:
            await db.users.update_one({"phone": phone}, {"$set": {"name": name, "lastLoginAt": iso(), "lastActiveAt": iso()}, "$inc": {"loginCount": 1}})
            user = {**existing, "name": name}
        else:
            user = {"id": str(uuid.uuid4()), "phone": phone, "name": name, "role": "user", "createdAt": iso(),
                    "lastLoginAt": iso(), "lastActiveAt": iso(), "loginCount": 1}
            await db.users.insert_one(dict(user))
        return {"token": make_token(user["id"], "user", 24 * 30), "user": user}

    @secured.get("/auth/me")
    async def me(user=Depends(current_user)):
        return user

    # ---------------- user activity & bills ----------------
    @secured.post("/activity")
    async def save_activity(body: ActivityIn, user=Depends(current_user)):
        if body.kind not in ACTIVITY_KINDS:
            raise HTTPException(422, "Unknown activity type.")
        if user["role"] == "admin":
            return {"saved": False}
        db = get_db()
        doc = {"id": str(uuid.uuid4()), "userId": user["id"], "phone": user["phone"], "name": user["name"],
               "kind": body.kind, "title": body.title, "inputs": body.inputs, "summary": body.summary, "createdAt": iso()}
        await db.activities.insert_one(dict(doc))
        await db.users.update_one({"id": user["id"]}, {"$set": {"lastActiveAt": iso()}})
        return {"saved": True, "id": doc["id"]}

    @secured.post("/bills")
    async def upload_bill(file: UploadFile = File(...), user=Depends(current_user)):
        if file.content_type not in BILL_TYPES:
            raise HTTPException(422, "Upload a PDF, JPG, PNG or WEBP file.")
        data = await file.read(MAX_BILL_BYTES + 1)
        if len(data) > MAX_BILL_BYTES:
            raise HTTPException(413, "File is larger than 4 MB. Please upload a smaller photo or PDF.")
        if not data:
            raise HTTPException(422, "The file is empty.")
        db = get_db()
        name = re.sub(r"[^\w.\- ]", "_", file.filename or "bill")[:120]
        fid = await AsyncIOMotorGridFSBucket(db, bucket_name="bills").upload_from_stream(
            name, data, metadata={"userId": user["id"], "contentType": file.content_type})
        await db.activities.insert_one({"id": str(uuid.uuid4()), "userId": user["id"], "phone": user.get("phone", ""),
                                        "name": user.get("name", ""), "kind": "bill_upload", "title": name,
                                        "inputs": {}, "summary": {"fileId": str(fid), "size": len(data), "contentType": file.content_type},
                                        "createdAt": iso()})
        await db.users.update_one({"id": user["id"]}, {"$set": {"lastActiveAt": iso()}})
        return {"uploaded": True, "fileId": str(fid), "filename": name}

    # ---------------- admin ----------------
    @public.post("/admin/login")
    async def admin_login(body: AdminLoginIn, request: Request):
        db = get_db()
        email = body.email.strip().lower()
        ip = (request.client.host if request.client else "")
        ident = f"{ip}:{email}"
        if await db.admin_login_attempts.count_documents({"ident": ident, "at": {"$gte": iso(now() - timedelta(minutes=15))}}) >= 5:
            raise HTTPException(429, "Too many failed attempts. Try again in 15 minutes.")
        admin = await db.admins.find_one({"email": email})
        seed_email, seed_pw = (os.environ.get("ADMIN_EMAIL") or "").strip().lower(), os.environ.get("ADMIN_PASSWORD")
        if not admin and seed_email and seed_pw and email == seed_email:
            admin = {"email": email, "password_hash": bcrypt.hashpw(seed_pw.encode(), bcrypt.gensalt()).decode(), "createdAt": iso()}
            await db.admins.insert_one(dict(admin))
        if not admin or not bcrypt.checkpw(body.password.encode(), admin["password_hash"].encode()):
            await db.admin_login_attempts.insert_one({"ident": ident, "at": iso()})
            raise HTTPException(401, "Wrong email or password.")
        await db.admin_login_attempts.delete_many({"ident": ident})
        return {"token": make_token(email, "admin", 12), "admin": {"email": email}}

    @secured.get("/admin/overview")
    async def admin_overview(_=Depends(current_admin)):
        db = get_db()
        week = iso(now() - timedelta(days=7))
        count = lambda kind: db.activities.count_documents({"kind": kind})  # noqa: E731
        return {
            "users": await db.users.count_documents({}),
            "newUsers7d": await db.users.count_documents({"createdAt": {"$gte": week}}),
            "activeUsers7d": await db.users.count_documents({"lastActiveAt": {"$gte": week}}),
            "savingsCalcs": await count("savings_calc"), "loanCalcs": await count("loan_calc"),
            "bills": await count("bill_upload"), "leads": await db.leads.count_documents({}),
        }

    @secured.get("/admin/users")
    async def admin_users(q: str = "", _=Depends(current_admin)):
        db = get_db()
        query = {"$or": [{"name": {"$regex": re.escape(q), "$options": "i"}}, {"phone": {"$regex": re.escape(q)}}]} if q else {}
        users = await db.users.find(query, {"_id": 0}).sort("lastActiveAt", -1).to_list(1000)
        counts = {}
        async for row in db.activities.aggregate([{"$group": {"_id": {"u": "$userId", "k": "$kind"}, "n": {"$sum": 1}}}]):
            counts.setdefault(row["_id"]["u"], {})[row["_id"]["k"]] = row["n"]
        for u in users:
            u["counts"] = counts.get(u["id"], {})
        return users

    @secured.get("/admin/users/{user_id}")
    async def admin_user(user_id: str, _=Depends(current_admin)):
        db = get_db()
        u = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not u:
            raise HTTPException(404, "User not found.")
        acts = await db.activities.find({"userId": user_id}, {"_id": 0}).sort("createdAt", -1).to_list(200)
        leads = await db.leads.find({"$or": [{"userId": user_id}, {"phone": {"$regex": u["phone"]}}]}, {"_id": 0}).to_list(50)
        return {"user": u, "activities": acts, "leads": leads}

    @secured.get("/admin/bills/{file_id}")
    async def admin_bill(file_id: str, _=Depends(current_admin)):
        db = get_db()
        try:
            stream = await AsyncIOMotorGridFSBucket(db, bucket_name="bills").open_download_stream(ObjectId(file_id))
        except Exception:
            raise HTTPException(404, "File not found.")
        data = await stream.read()
        ctype = (stream.metadata or {}).get("contentType", "application/octet-stream")
        return Response(content=data, media_type=ctype, headers={"Content-Disposition": f'inline; filename="{stream.filename}"'})

    return public, secured, current_user, current_admin
