"""RK POOJA - FastAPI backend.
ONE APP. ALL RIDES.
"""
import os
import logging
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from models import (
    UserCreate, UserLogin, UserDoc, UserPublic,
    InquiryCreate, InquiryDoc, InquiryUpdate,
    AIChatRequest, AIChatResponse, VoiceParseRequest,
    QuoteRequest, QuoteResponse, ChatMessageDoc,
    utc_now,
)
from auth import (
    hash_password, verify_password, create_token,
    get_current_user, get_current_user_optional, require_admin,
)
from ai_service import (
    ai_chat_reply, ai_parse_voice, estimate_distance_km, estimate_quote, score_lead,
)

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

users_col = db.users
inquiries_col = db.inquiries
chats_col = db.chat_messages


def _strip(doc: dict) -> dict:
    if doc and "_id" in doc:
        doc = {k: v for k, v in doc.items() if k != "_id"}
    return doc


app = FastAPI(title="RK POOJA API", version="1.0.0")
api = APIRouter(prefix="/api")


@api.get("/")
async def root():
    return {"app": "RK POOJA", "tagline": "ONE APP. ALL RIDES.", "status": "ok"}


# ---------- Auth ----------
@api.post("/auth/register")
async def register(payload: UserCreate):
    existing = await users_col.find_one({"email": payload.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = UserDoc(
        name=payload.name,
        email=payload.email.lower(),
        phone=payload.phone,
        language=payload.language or "en",
        role="user",
        password_hash=hash_password(payload.password),
    )
    doc = user.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await users_col.insert_one(doc)
    token = create_token(user.id, user.role)
    return {
        "token": token,
        "user": UserPublic(id=user.id, name=user.name, email=user.email,
                           phone=user.phone, language=user.language, role=user.role),
    }


@api.post("/auth/login")
async def login(payload: UserLogin):
    doc = await users_col.find_one({"email": payload.email.lower()})
    if not doc or not verify_password(payload.password, doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(doc["id"], doc.get("role", "user"))
    return {
        "token": token,
        "user": {
            "id": doc["id"], "name": doc["name"], "email": doc["email"],
            "phone": doc.get("phone"), "language": doc.get("language", "en"),
            "role": doc.get("role", "user"),
        },
    }


@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    doc = await users_col.find_one({"id": user["sub"]})
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": doc["id"], "name": doc["name"], "email": doc["email"],
        "phone": doc.get("phone"), "language": doc.get("language", "en"),
        "role": doc.get("role", "user"),
    }


@api.patch("/auth/me")
async def update_me(payload: dict, user=Depends(get_current_user)):
    update = {}
    for k in ["name", "phone", "language"]:
        if k in payload and payload[k] is not None:
            update[k] = payload[k]
    if not update:
        raise HTTPException(status_code=400, detail="Nothing to update")
    await users_col.update_one({"id": user["sub"]}, {"$set": update})
    doc = await users_col.find_one({"id": user["sub"]})
    return {
        "id": doc["id"], "name": doc["name"], "email": doc["email"],
        "phone": doc.get("phone"), "language": doc.get("language", "en"),
        "role": doc.get("role", "user"),
    }


# ---------- Inquiries ----------
@api.post("/inquiries")
async def create_inquiry(payload: InquiryCreate, user=Depends(get_current_user_optional)):
    raw = payload.model_dump()
    distance = estimate_distance_km(raw.get("pickup", ""), raw.get("destination"))
    quote = estimate_quote(raw["service_type"], raw.get("vehicle_category"), distance)
    score = score_lead(raw)

    inquiry = InquiryDoc(
        **raw,
        user_id=user["sub"] if user else None,
        lead_score=score["lead_score"],
        lead_score_reason=score["lead_score_reason"],
        quote_min=quote["quote_min"],
        quote_max=quote["quote_max"],
        distance_km=quote["distance_km"],
    )
    doc = inquiry.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    await inquiries_col.insert_one(doc)
    return _strip(doc)


@api.get("/inquiries/me")
async def my_inquiries(user=Depends(get_current_user)):
    cur = inquiries_col.find({"user_id": user["sub"]}, {"_id": 0}).sort("created_at", -1)
    return await cur.to_list(500)


@api.get("/inquiries/{inquiry_id}")
async def get_inquiry(inquiry_id: str):
    doc = await inquiries_col.find_one({"id": inquiry_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    return doc


# ---------- AI ----------
@api.post("/ai/chat", response_model=AIChatResponse)
async def ai_chat(payload: AIChatRequest, user=Depends(get_current_user_optional)):
    um = ChatMessageDoc(session_id=payload.session_id, user_id=user["sub"] if user else None,
                       role="user", content=payload.message, language=payload.language)
    udoc = um.model_dump(); udoc["created_at"] = udoc["created_at"].isoformat()
    await chats_col.insert_one(udoc)

    reply = await ai_chat_reply(payload.session_id, payload.message, payload.language)

    am = ChatMessageDoc(session_id=payload.session_id, user_id=user["sub"] if user else None,
                       role="assistant", content=reply, language=payload.language)
    adoc = am.model_dump(); adoc["created_at"] = adoc["created_at"].isoformat()
    await chats_col.insert_one(adoc)
    return AIChatResponse(reply=reply, session_id=payload.session_id)


@api.get("/ai/chat/{session_id}")
async def ai_chat_history(session_id: str):
    cur = chats_col.find({"session_id": session_id}, {"_id": 0}).sort("created_at", 1)
    return await cur.to_list(200)


@api.post("/ai/voice-parse")
async def voice_parse(payload: VoiceParseRequest):
    return await ai_parse_voice(payload.transcript, payload.language)


@api.post("/ai/quote", response_model=QuoteResponse)
async def ai_quote(payload: QuoteRequest):
    distance = estimate_distance_km(payload.pickup, payload.destination)
    return estimate_quote(payload.service_type, payload.vehicle_category, distance)


# ---------- Admin ----------
@api.get("/admin/inquiries")
async def admin_list(
    status: Optional[str] = None,
    lead_score: Optional[str] = None,
    service_type: Optional[str] = None,
    q: Optional[str] = None,
    _admin=Depends(require_admin),
):
    query: dict = {}
    if status: query["status"] = status
    if lead_score: query["lead_score"] = lead_score
    if service_type: query["service_type"] = service_type
    if q:
        query["$or"] = [
            {"customer_name": {"$regex": q, "$options": "i"}},
            {"customer_phone": {"$regex": q, "$options": "i"}},
            {"pickup": {"$regex": q, "$options": "i"}},
            {"destination": {"$regex": q, "$options": "i"}},
        ]
    cur = inquiries_col.find(query, {"_id": 0}).sort("created_at", -1)
    return await cur.to_list(1000)


@api.patch("/admin/inquiries/{inquiry_id}")
async def admin_update(inquiry_id: str, payload: InquiryUpdate, _admin=Depends(require_admin)):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    update["updated_at"] = utc_now().isoformat()
    res = await inquiries_col.update_one({"id": inquiry_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    return await inquiries_col.find_one({"id": inquiry_id}, {"_id": 0})


@api.get("/admin/stats")
async def admin_stats(_admin=Depends(require_admin)):
    total = await inquiries_col.count_documents({})
    by_score = {s: await inquiries_col.count_documents({"lead_score": s}) for s in ["hot", "warm", "cold"]}
    by_status = {s: await inquiries_col.count_documents({"status": s}) for s in ["new", "contacted", "quoted", "converted", "closed"]}
    by_service = {s: await inquiries_col.count_documents({"service_type": s}) for s in ["car", "auto", "bike", "tempo", "bus", "porter", "goods"]}
    user_count = await users_col.count_documents({})

    pipe = [
        {"$group": {"_id": {"$substr": ["$created_at", 0, 10]}, "count": {"$sum": 1}}},
        {"$sort": {"_id": -1}}, {"$limit": 7},
    ]
    trend = list(reversed(await inquiries_col.aggregate(pipe).to_list(7)))

    rev_pipe = [{"$match": {"status": "converted"}},
                {"$group": {"_id": None, "total": {"$sum": "$quote_max"}}}]
    rr = await inquiries_col.aggregate(rev_pipe).to_list(1)
    revenue = rr[0]["total"] if rr else 0

    return {
        "total_inquiries": total, "users": user_count,
        "by_lead_score": by_score, "by_status": by_status,
        "by_service": by_service, "trend": trend, "estimated_revenue": revenue,
    }


@api.get("/admin/users")
async def admin_users(_admin=Depends(require_admin)):
    cur = users_col.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1)
    return await cur.to_list(1000)


@api.get("/whatsapp/number")
async def whatsapp_number():
    return {"number": os.environ.get("WHATSAPP_NUMBER", "919999999999")}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def seed_admin():
    admin_email = "admin@rkpooja.in"
    existing = await users_col.find_one({"email": admin_email})
    if not existing:
        admin = UserDoc(
            name="RK POOJA Admin", email=admin_email, phone="+919999999999",
            language="en", role="admin",
            password_hash=hash_password("admin@123"),
        )
        doc = admin.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        await users_col.insert_one(doc)
        logger.info("Seeded default admin: %s", admin_email)


@app.on_event("shutdown")
async def shutdown_db():
    client.close()
