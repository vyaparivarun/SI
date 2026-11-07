"""Phone-OTP login (Firebase Phone Auth), admin login, per-user activity + bill storage, admin panel APIs."""
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


# ---------------- Firebase phone auth ----------------
# The browser signs in with Firebase (Firebase sends the SMS), then posts the Firebase ID token here.
# We verify it against Google's public keys and issue our own session token; users stay in MongoDB.
FIREBASE_CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
_fb_certs: Dict[str, Any] = {"keys": {}, "exp": 0.0}


def firebase_project() -> str:
    pid = (os.environ.get("FIREBASE_PROJECT_ID") or "").strip()
    if not pid:
        raise HTTPException(503, "Login isn't switched on yet (FIREBASE_PROJECT_ID missing).")
    return pid


async def firebase_keys() -> Dict[str, Any]:
    import time
    from cryptography.x509 import load_pem_x509_certificate
    if _fb_certs["keys"] and time.time() < _fb_certs["exp"]:
        return _fb_certs["keys"]
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.get(FIREBASE_CERTS_URL)
        r.raise_for_status()
    except httpx.HTTPError:
        if _fb_certs["keys"]:
            return _fb_certs["keys"]
        raise HTTPException(503, "Couldn't reach the login service. Please try again in a minute.")
    m = re.search(r"max-age=(\d+)", r.headers.get("cache-control", ""))
    _fb_certs["keys"] = {kid: load_pem_x509_certificate(pem.encode()).public_key() for kid, pem in r.json().items()}
    _fb_certs["exp"] = time.time() + (int(m.group(1)) if m else 3600)
    return _fb_certs["keys"]


async def verify_firebase_token(id_token: str) -> dict:
    pid = firebase_project()
    try:
        kid = jwt.get_unverified_header(id_token).get("kid")
    except jwt.PyJWTError:
        raise HTTPException(401, "Login failed. Please try again.")
    key = (await firebase_keys()).get(kid)
    if key is None:
        _fb_certs["exp"] = 0  # keys may have rotated: refetch once
        key = (await firebase_keys()).get(kid)
    if key is None:
        raise HTTPException(401, "Login failed. Please try again.")
    try:
        claims = jwt.decode(id_token, key, algorithms=["RS256"], audience=pid,
                            issuer=f"https://securetoken.google.com/{pid}", leeway=60)
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Your login code expired. Please request a new one.")
    except jwt.PyJWTError:
        raise HTTPException(401, "Login failed. Please try again.")
    if not claims.get("sub") or not claims.get("phone_number"):
        raise HTTPException(401, "This login has no verified mobile number.")
    return claims


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


def client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for", "")
    return fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else "")


def looks_like(data: bytes, ctype: str) -> bool:
    if ctype == "application/pdf":
        return data[:5] == b"%PDF-"
    if ctype == "image/jpeg":
        return data[:3] == b"\xff\xd8\xff"
    if ctype == "image/png":
        return data[:8] == b"\x89PNG\r\n\x1a\n"
    return data[:4] == b"RIFF" and data[8:12] == b"WEBP"


class FirebaseLoginIn(BaseModel):
    idToken: str = Field(min_length=20, max_length=4096)
    name: str = Field(min_length=2, max_length=80)


class AdminLoginIn(BaseModel):
    email: str
    password: str


class ActivityIn(BaseModel):
    kind: str
    title: str = Field(default="", max_length=160)
    inputs: Dict[str, Any] = {}
    summary: Dict[str, Any] = {}


async def upsert_user(db, phone: str, name: str, firebase_uid: Optional[str] = None) -> dict:
    extra = {"firebaseUid": firebase_uid} if firebase_uid else {}
    existing = await db.users.find_one({"phone": phone}, {"_id": 0})
    if existing:
        await db.users.update_one({"phone": phone}, {"$set": {"name": name, "lastLoginAt": iso(), "lastActiveAt": iso(), **extra},
                                                     "$inc": {"loginCount": 1}})
        return {**existing, "name": name, **extra}
    user = {"id": str(uuid.uuid4()), "phone": phone, "name": name, "role": "user", "createdAt": iso(),
            "lastLoginAt": iso(), "lastActiveAt": iso(), "loginCount": 1, **extra}
    await db.users.insert_one(dict(user))
    return user


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

    # ---------------- phone login (Firebase) ----------------
    @public.post("/auth/firebase")
    async def firebase_login(body: FirebaseLoginIn):
        claims = await verify_firebase_token(body.idToken)
        jwt_secret()  # fail clearly before touching the database if sessions can't be issued
        phone = norm_phone(claims["phone_number"])
        user = await upsert_user(get_db(), phone, body.name.strip(), firebase_uid=claims["sub"])
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
        if not looks_like(data, file.content_type):
            raise HTTPException(422, "This file doesn't look like a real PDF or image. Please upload the bill again.")
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
        ip = client_ip(request)
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
