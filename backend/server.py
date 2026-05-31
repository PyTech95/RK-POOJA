"""RK POOJA - FastAPI backend.
ONE APP. ALL RIDES.
"""
import os
import logging
import uuid
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Header, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Header, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

from models import (
    UserCreate, UserLogin, UserDoc, UserPublic,
    InquiryCreate, InquiryDoc, InquiryUpdate,
    AIChatRequest, AIChatResponse, VoiceParseRequest,
    QuoteRequest, QuoteResponse, ChatMessageDoc,
    WalletTopupRequest, WalletCreditRequest, ApplyReferralRequest, ReverseGeoRequest,
    DriverSignupRequest, DriverProfileUpdate, DriverStatusRequest, DriverLocationRequest,
    DriverKycReviewRequest, RatingRequest,
    utc_now,
)
from auth import (
    hash_password, verify_password, create_token,
    get_current_user, get_current_user_optional, require_admin,
)
from ai_service import (
    ai_chat_reply, ai_parse_voice, real_distance_km, estimate_quote, score_lead,
)
from wallet_service import (
    ensure_wallet_and_referral, get_balance, credit_wallet, apply_referral,
    reverse_geocode,
)
from driver_service import (
    ensure_driver_profile, update_driver_profile, get_matching_inquiries,
    accept_inquiry, update_driver_rating, DRIVER_SIGNUP_BONUS,
)
from storage_service import put_object, get_object, init_storage, APP_NAME, MIME_BY_EXT



def uuid_str():
    return str(uuid.uuid4())

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

users_col = db.users
inquiries_col = db.inquiries
chats_col = db.chat_messages
wallets_col = db.wallets
transactions_col = db.transactions
referrals_col = db.referrals
driver_profiles_col = db.driver_profiles
ratings_col = db.ratings
files_col = db.files
payment_txns_col = db.payment_transactions


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

    # Wallet + referral code + signup bonus
    await ensure_wallet_and_referral(db, user.id, user.name)
    if payload.referral_code:
        await apply_referral(db, user.id, payload.referral_code)

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
    distance, source = await real_distance_km(
        raw.get("pickup", ""), raw.get("destination"),
        pickup_lat=raw.get("pickup_lat"), pickup_lon=raw.get("pickup_lon"),
        dest_lat=raw.get("dest_lat"), dest_lon=raw.get("dest_lon"),
    )
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
        distance_source=source,
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
    distance, source = await real_distance_km(
        payload.pickup, payload.destination,
        pickup_lat=payload.pickup_lat, pickup_lon=payload.pickup_lon,
        dest_lat=payload.dest_lat, dest_lon=payload.dest_lon,
    )
    q = estimate_quote(payload.service_type, payload.vehicle_category, distance)
    q["distance_source"] = source
    return q


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
    return {
        "number": os.environ.get("WHATSAPP_NUMBER", "919955095226"),
        "owner": os.environ.get("OWNER_NAME", "RK POOJA"),
    }


# ---------- Driver ----------
@api.post("/driver/signup")
async def driver_signup(payload: DriverSignupRequest):
    existing = await users_col.find_one({"email": payload.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered. Please login.")
    user = UserDoc(
        name=payload.name,
        email=payload.email.lower(),
        phone=payload.phone,
        language=payload.language or "en",
        role="driver",
        password_hash=hash_password(payload.password),
    )
    doc = user.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await users_col.insert_one(doc)

    # Wallet + referral code
    await ensure_wallet_and_referral(db, user.id, user.name)
    if payload.referral_code:
        await apply_referral(db, user.id, payload.referral_code)
    # Extra driver signup bonus
    if DRIVER_SIGNUP_BONUS > 0:
        await credit_wallet(db, user.id, DRIVER_SIGNUP_BONUS, "credit",
                            note="Driver signup bonus")

    # Driver profile
    await ensure_driver_profile(db, user.id)
    await update_driver_profile(db, user.id, {
        "vehicle_type": payload.vehicle_type,
        "vehicle_category": payload.vehicle_category,
        "vehicle_number": payload.vehicle_number,
        "base_city": payload.base_city,
    })

    token = create_token(user.id, user.role)
    return {
        "token": token,
        "user": {
            "id": user.id, "name": user.name, "email": user.email,
            "phone": user.phone, "language": user.language, "role": user.role,
        },
    }


def _require_driver(user: dict):
    if user.get("role") not in ("driver", "admin"):
        raise HTTPException(status_code=403, detail="Driver access required")


@api.get("/driver/me")
async def driver_me(user=Depends(get_current_user)):
    _require_driver(user)
    profile = await driver_profiles_col.find_one({"user_id": user["sub"]}, {"_id": 0})
    if not profile:
        profile = await ensure_driver_profile(db, user["sub"])
    udoc = await users_col.find_one({"id": user["sub"]}, {"_id": 0, "password_hash": 0})
    return {"user": udoc, "profile": profile}


@api.patch("/driver/me")
async def driver_update_me(payload: DriverProfileUpdate, user=Depends(get_current_user)):
    _require_driver(user)
    updated = await update_driver_profile(db, user["sub"], payload.model_dump(exclude_none=True))
    return updated


@api.post("/driver/status")
async def driver_set_status(payload: DriverStatusRequest, user=Depends(get_current_user)):
    _require_driver(user)
    await update_driver_profile(db, user["sub"], {"online": payload.online})
    return {"online": payload.online}


@api.post("/driver/location")
async def driver_set_location(payload: DriverLocationRequest, user=Depends(get_current_user)):
    _require_driver(user)
    await update_driver_profile(db, user["sub"], {
        "current_lat": payload.lat,
        "current_lon": payload.lon,
        "last_location_at": utc_now().isoformat(),
    })
    return {"ok": True}


@api.get("/driver/inquiries")
async def driver_get_inquiries(user=Depends(get_current_user)):
    _require_driver(user)
    profile = await driver_profiles_col.find_one({"user_id": user["sub"]}, {"_id": 0})
    if not profile:
        return []
    if not profile.get("online"):
        return []
    return await get_matching_inquiries(db, profile, limit=50)


@api.get("/driver/inquiries/mine")
async def driver_my_inquiries(user=Depends(get_current_user)):
    _require_driver(user)
    cur = inquiries_col.find({"assigned_driver_id": user["sub"]}, {"_id": 0}).sort("accepted_at", -1)
    return await cur.to_list(500)


@api.post("/driver/inquiries/{inquiry_id}/accept")
async def driver_accept(inquiry_id: str, user=Depends(get_current_user)):
    _require_driver(user)
    res = await accept_inquiry(db, inquiry_id, user["sub"])
    if not res:
        raise HTTPException(status_code=409, detail="Inquiry already taken or not available")
    return res


@api.post("/driver/inquiries/{inquiry_id}/reject")
async def driver_reject(inquiry_id: str, user=Depends(get_current_user)):
    """Soft-reject: record the rejection so we don't show it again to this driver."""
    _require_driver(user)
    await inquiries_col.update_one(
        {"id": inquiry_id},
        {"$addToSet": {"rejected_by_drivers": user["sub"]}},
    )
    return {"ok": True}


@api.get("/driver/inquiries/{inquiry_id}")
async def driver_inquiry_detail(inquiry_id: str, user=Depends(get_current_user)):
    _require_driver(user)
    doc = await inquiries_col.find_one({"id": inquiry_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    if doc.get("assigned_driver_id") not in (user["sub"], None) and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not your inquiry")
    return doc


# ---------- Ratings ----------
@api.post("/ratings")
async def submit_rating(payload: RatingRequest, user=Depends(get_current_user)):
    inq = await inquiries_col.find_one({"id": payload.inquiry_id})
    if not inq:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    if inq.get("user_id") != user["sub"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="You can only rate your own inquiries")
    driver_id = inq.get("assigned_driver_id")
    if not driver_id:
        raise HTTPException(status_code=400, detail="No driver assigned yet")
    if not (1 <= int(payload.stars) <= 5):
        raise HTTPException(status_code=400, detail="Stars must be 1-5")
    # one rating per inquiry
    existing = await ratings_col.find_one({"inquiry_id": payload.inquiry_id, "rater_user_id": user["sub"]})
    if existing:
        raise HTTPException(status_code=400, detail="Already rated")
    rdoc = {
        "id": str(uuid_str()),
        "inquiry_id": payload.inquiry_id,
        "rater_user_id": user["sub"],
        "driver_user_id": driver_id,
        "stars": int(payload.stars),
        "comment": payload.comment,
        "created_at": utc_now().isoformat(),
    }
    await ratings_col.insert_one(rdoc)
    await update_driver_rating(db, driver_id, int(payload.stars))
    return {"ok": True}


@api.get("/driver/ratings")
async def my_driver_ratings(user=Depends(get_current_user)):
    _require_driver(user)
    cur = ratings_col.find({"driver_user_id": user["sub"]}, {"_id": 0}).sort("created_at", -1).limit(100)
    return await cur.to_list(100)


# ---------- KYC Document Upload (Emergent Object Storage) ----------
ALLOWED_KYC_TYPES = {"aadhaar", "dl", "rc", "pan", "insurance", "vehicle_photo"}
MAX_KYC_SIZE = 8 * 1024 * 1024  # 8 MB


@api.post("/driver/kyc/upload")
async def driver_kyc_upload(
    doc_type: str = Query(...),
    file: UploadFile = File(...),
    user=Depends(get_current_user),
):
    _require_driver(user)
    if doc_type not in ALLOWED_KYC_TYPES:
        raise HTTPException(status_code=400, detail=f"doc_type must be one of {sorted(ALLOWED_KYC_TYPES)}")
    data = await file.read()
    if len(data) > MAX_KYC_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 8 MB)")
    ext = (file.filename or "bin").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else "bin"
    content_type = file.content_type or MIME_BY_EXT.get(ext, "application/octet-stream")
    if not (content_type.startswith("image/") or content_type == "application/pdf"):
        raise HTTPException(status_code=415, detail="Only images or PDFs accepted")

    path = f"{APP_NAME}/kyc/{user['sub']}/{uuid_str()}.{ext}"
    try:
        result = put_object(path, data, content_type)
    except Exception as e:
        logger.exception("KYC upload failed")
        raise HTTPException(status_code=500, detail=f"Upload failed: {e}")

    file_doc = {
        "id": uuid_str(),
        "owner_user_id": user["sub"],
        "purpose": "kyc",
        "doc_type": doc_type,
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": content_type,
        "size": result.get("size", len(data)),
        "is_deleted": False,
        "created_at": utc_now().isoformat(),
    }
    await files_col.insert_one(file_doc)

    # save URL ref on driver profile
    await driver_profiles_col.update_one(
        {"user_id": user["sub"]},
        {"$set": {f"kyc_docs.{doc_type}": {
            "file_id": file_doc["id"],
            "path": result["path"],
            "uploaded_at": file_doc["created_at"],
        }, "kyc_status": "pending"}},
        upsert=True,
    )

    return {"file_id": file_doc["id"], "doc_type": doc_type, "size": file_doc["size"]}


@api.get("/files/{file_id}")
async def serve_file(file_id: str, auth: Optional[str] = Query(None), authorization: Optional[str] = Header(None)):
    """Serve a file. Accepts either Bearer token via header or ?auth= query (for <img>)."""
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
    elif auth:
        token = auth
    if not token:
        raise HTTPException(status_code=401, detail="Auth required")
    try:
        from auth import decode_token
        decoded = decode_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    record = await files_col.find_one({"id": file_id, "is_deleted": False})
    if not record:
        raise HTTPException(status_code=404, detail="Not found")
    # auth: owner OR admin
    if decoded["sub"] != record["owner_user_id"] and decoded.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    data, content_type = get_object(record["storage_path"])
    return Response(content=data, media_type=record.get("content_type", content_type))


# ---------- Stripe Payments (Wallet Top-up) ----------
WALLET_PACKAGES = {
    "100": 100.0, "500": 500.0, "1000": 1000.0, "2000": 2000.0, "5000": 5000.0,
}


@api.post("/wallet/checkout/session")
async def wallet_checkout_session(payload: dict, request: Request, user=Depends(get_current_user)):
    """Create a Stripe Checkout session for wallet top-up.
    Body: {package_id: '100'|'500'|..., origin_url: 'https://...'}"""
    package_id = str(payload.get("package_id", "")).strip()
    origin_url = str(payload.get("origin_url", "")).rstrip("/")
    if package_id not in WALLET_PACKAGES:
        raise HTTPException(status_code=400, detail="Invalid package")
    if not origin_url.startswith("http"):
        raise HTTPException(status_code=400, detail="Invalid origin_url")

    amount = WALLET_PACKAGES[package_id]
    api_key = os.environ["STRIPE_API_KEY"]
    webhook_url = f"{str(request.base_url).rstrip('/')}/api/webhook/stripe"
    checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)

    success_url = f"{origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin_url}/dashboard?tab=wallet"
    req = CheckoutSessionRequest(
        amount=amount, currency="inr",
        success_url=success_url, cancel_url=cancel_url,
        metadata={"user_id": user["sub"], "package_id": package_id, "purpose": "wallet_topup"},
    )
    session = await checkout.create_checkout_session(req)

    await payment_txns_col.insert_one({
        "id": uuid_str(),
        "session_id": session.session_id,
        "user_id": user["sub"],
        "amount": amount, "currency": "inr",
        "package_id": package_id,
        "payment_status": "initiated",
        "status": "open",
        "metadata": {"purpose": "wallet_topup"},
        "credited": False,
        "created_at": utc_now().isoformat(),
        "updated_at": utc_now().isoformat(),
    })
    return {"url": session.url, "session_id": session.session_id}


@api.get("/wallet/checkout/status/{session_id}")
async def wallet_checkout_status(session_id: str, request: Request, user=Depends(get_current_user)):
    api_key = os.environ["STRIPE_API_KEY"]
    webhook_url = f"{str(request.base_url).rstrip('/')}/api/webhook/stripe"
    checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    status = await checkout.get_checkout_status(session_id)

    txn = await payment_txns_col.find_one({"session_id": session_id})
    if not txn:
        raise HTTPException(status_code=404, detail="Session not found")
    if txn["user_id"] != user["sub"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")

    await payment_txns_col.update_one(
        {"session_id": session_id},
        {"$set": {
            "payment_status": status.payment_status,
            "status": status.status,
            "updated_at": utc_now().isoformat(),
        }},
    )

    # Idempotent credit
    if status.payment_status == "paid" and not txn.get("credited"):
        await credit_wallet(db, txn["user_id"], int(float(txn["amount"])), "topup",
                            note=f"Stripe top-up ₹{int(float(txn['amount']))}", ref_id=session_id)
        await payment_txns_col.update_one({"session_id": session_id}, {"$set": {"credited": True}})

    return {
        "session_id": session_id,
        "payment_status": status.payment_status,
        "status": status.status,
        "amount": int(float(txn["amount"])),
        "currency": status.currency,
    }


@api.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("Stripe-Signature")
    api_key = os.environ["STRIPE_API_KEY"]
    webhook_url = f"{str(request.base_url).rstrip('/')}/api/webhook/stripe"
    checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    try:
        evt = await checkout.handle_webhook(body, sig)
    except Exception as e:
        logger.exception("webhook handling failed")
        raise HTTPException(status_code=400, detail=str(e))

    if evt.payment_status == "paid":
        txn = await payment_txns_col.find_one({"session_id": evt.session_id})
        if txn and not txn.get("credited"):
            await credit_wallet(db, txn["user_id"], int(float(txn["amount"])), "topup",
                                note=f"Stripe top-up ₹{int(float(txn['amount']))} (webhook)",
                                ref_id=evt.session_id)
            await payment_txns_col.update_one({"session_id": evt.session_id},
                {"$set": {"credited": True, "payment_status": "paid", "status": "complete",
                          "updated_at": utc_now().isoformat()}})
    return {"ok": True}


# ---------- Admin Driver Management ----------
@api.get("/admin/drivers")
async def admin_drivers(_admin=Depends(require_admin)):
    profiles = await driver_profiles_col.find({}, {"_id": 0}).to_list(1000)
    if not profiles:
        return []
    uids = [p["user_id"] for p in profiles]
    users = await users_col.find({"id": {"$in": uids}}, {"_id": 0, "password_hash": 0}).to_list(1000)
    bu = {u["id"]: u for u in users}
    out = []
    for p in profiles:
        u = bu.get(p["user_id"], {})
        out.append({**p, "name": u.get("name"), "email": u.get("email"), "phone": u.get("phone")})
    return out


@api.post("/admin/drivers/{driver_user_id}/kyc")
async def admin_review_kyc(driver_user_id: str, payload: DriverKycReviewRequest, _admin=Depends(require_admin)):
    if payload.status not in ("approved", "rejected", "pending"):
        raise HTTPException(status_code=400, detail="Invalid status")
    await update_driver_profile(db, driver_user_id, {
        "kyc_status": payload.status,
        "kyc_notes": payload.notes,
    })
    return {"ok": True}


# ---------- Wallet ----------
@api.get("/wallet/me")
async def my_wallet(user=Depends(get_current_user)):
    balance = await get_balance(db, user["sub"])
    cur = transactions_col.find({"user_id": user["sub"]}, {"_id": 0}).sort("created_at", -1).limit(50)
    txns = await cur.to_list(50)
    return {"balance": balance, "currency": "INR", "transactions": txns}


@api.post("/wallet/topup")
async def wallet_topup(payload: WalletTopupRequest, user=Depends(get_current_user)):
    """Mock top-up — instantly credits the wallet. Replace with Stripe/Razorpay later."""
    if payload.amount <= 0 or payload.amount > 100000:
        raise HTTPException(status_code=400, detail="Invalid amount")
    await credit_wallet(db, user["sub"], payload.amount, "topup",
                        note=f"Wallet top-up of ₹{payload.amount}")
    return {"balance": await get_balance(db, user["sub"]), "amount": payload.amount}


# ---------- Referrals ----------
@api.get("/referrals/me")
async def my_referrals(user=Depends(get_current_user)):
    ref = await referrals_col.find_one({"user_id": user["sub"]}, {"_id": 0})
    if not ref:
        # Create on demand
        u = await users_col.find_one({"id": user["sub"]}, {"_id": 0})
        await ensure_wallet_and_referral(db, user["sub"], u.get("name", "RK") if u else "RK")
        ref = await referrals_col.find_one({"user_id": user["sub"]}, {"_id": 0})
    return {
        "code": ref["code"],
        "referred_count": len(ref.get("referred_user_ids", [])),
        "total_earned": ref.get("total_earned", 0),
        "share_text": (
            f"Hey! 🚗 I use RK POOJA for all rides — cars, autos, bus, parcels & goods. "
            f"Sign up with my code {ref['code']} and we both get ₹100 wallet credit. "
            f"https://rkpooja.in/signup?ref={ref['code']}"
        ),
    }


@api.post("/referrals/apply")
async def apply_my_referral(payload: ApplyReferralRequest, user=Depends(get_current_user)):
    # Only useful if user didn't apply during signup; one-shot
    user_doc = await users_col.find_one({"id": user["sub"]})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    # check already applied
    already = await referrals_col.find_one({"referred_user_ids": user["sub"]})
    if already:
        raise HTTPException(status_code=400, detail="Referral code already applied")
    ok = await apply_referral(db, user["sub"], payload.code)
    if not ok:
        raise HTTPException(status_code=400, detail="Invalid referral code")
    return {"ok": True, "balance": await get_balance(db, user["sub"])}


# ---------- Geo ----------
@api.post("/geo/reverse")
async def geo_reverse(payload: ReverseGeoRequest):
    return await reverse_geocode(payload.lat, payload.lon)


# ---------- Admin: wallet / users / referrals ----------
@api.post("/admin/wallet/credit")
async def admin_wallet_credit(payload: WalletCreditRequest, _admin=Depends(require_admin)):
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid amount")
    user_doc = await users_col.find_one({"id": payload.user_id})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    await credit_wallet(db, payload.user_id, payload.amount, "admin_credit",
                        note=payload.note or "Admin credit")
    return {"ok": True, "balance": await get_balance(db, payload.user_id)}


@api.get("/admin/transactions")
async def admin_transactions(user_id: Optional[str] = None, _admin=Depends(require_admin)):
    q = {"user_id": user_id} if user_id else {}
    cur = transactions_col.find(q, {"_id": 0}).sort("created_at", -1).limit(500)
    return await cur.to_list(500)


@api.get("/admin/users/full")
async def admin_users_full(_admin=Depends(require_admin)):
    """Users + wallet balance + referral stats joined."""
    users = await users_col.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(1000)
    wallets = await wallets_col.find({}, {"_id": 0}).to_list(1000)
    refs = await referrals_col.find({}, {"_id": 0}).to_list(1000)
    bw = {w["user_id"]: w for w in wallets}
    br = {r["user_id"]: r for r in refs}
    for u in users:
        u["balance"] = int(bw.get(u["id"], {}).get("balance", 0))
        rr = br.get(u["id"])
        u["referral_code"] = rr["code"] if rr else None
        u["referred_count"] = len(rr.get("referred_user_ids", [])) if rr else 0
    return users


@api.get("/admin/referrals")
async def admin_referrals(_admin=Depends(require_admin)):
    refs = await referrals_col.find({}, {"_id": 0}).sort("total_earned", -1).to_list(1000)
    # join user name
    users = await users_col.find({}, {"_id": 0, "id": 1, "name": 1, "email": 1}).to_list(1000)
    bu = {u["id"]: u for u in users}
    for r in refs:
        u = bu.get(r["user_id"], {})
        r["owner_name"] = u.get("name")
        r["owner_email"] = u.get("email")
    return refs


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
    # Try to init object storage (non-fatal if it fails)
    try:
        init_storage()
        logger.info("Object storage initialized")
    except Exception as e:
        logger.warning("Object storage init failed (will retry on demand): %s", e)

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
    # Ensure all existing users have wallet + referral
    async for u in users_col.find({}, {"_id": 0, "id": 1, "name": 1}):
        await ensure_wallet_and_referral(db, u["id"], u.get("name", "RK"))


@app.on_event("shutdown")
async def shutdown_db():
    client.close()
