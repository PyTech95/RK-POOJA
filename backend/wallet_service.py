"""Wallet, transactions and referral service."""
import os
import random
import string
import httpx
import logging
from datetime import datetime, timezone

from models import WalletDoc, TransactionDoc, ReferralDoc

logger = logging.getLogger(__name__)

# Signup bonus & referral economics (INR)
SIGNUP_BONUS = int(os.environ.get("SIGNUP_BONUS", "50"))
REFERRAL_BONUS_REFERRER = int(os.environ.get("REFERRAL_BONUS_REFERRER", "100"))
REFERRAL_BONUS_REFEREE = int(os.environ.get("REFERRAL_BONUS_REFEREE", "100"))


def _gen_code(name: str) -> str:
    prefix = "".join([c for c in (name or "RK").upper() if c.isalpha()])[:3] or "RKP"
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"{prefix}{suffix}"


async def ensure_wallet_and_referral(db, user_id: str, user_name: str = "RK"):
    """Idempotent: create wallet + referral code for a user if not present, and grant signup bonus."""
    wallet = await db.wallets.find_one({"user_id": user_id})
    if not wallet:
        w = WalletDoc(user_id=user_id, balance=SIGNUP_BONUS).model_dump()
        w["created_at"] = w["created_at"].isoformat()
        w["updated_at"] = w["updated_at"].isoformat()
        await db.wallets.insert_one(w)
        if SIGNUP_BONUS > 0:
            await _record_txn(db, user_id, "credit", SIGNUP_BONUS, "in", "Welcome bonus")

    ref = await db.referrals.find_one({"user_id": user_id})
    if not ref:
        # ensure unique code
        for _ in range(8):
            code = _gen_code(user_name)
            existing = await db.referrals.find_one({"code": code})
            if not existing:
                break
        r = ReferralDoc(user_id=user_id, code=code).model_dump()
        r["created_at"] = r["created_at"].isoformat()
        await db.referrals.insert_one(r)


async def _record_txn(db, user_id: str, ttype: str, amount: int, direction: str,
                      note: str = None, ref_id: str = None):
    t = TransactionDoc(
        user_id=user_id, type=ttype, amount=amount,
        direction=direction, note=note, ref_id=ref_id,
    ).model_dump()
    t["created_at"] = t["created_at"].isoformat()
    await db.transactions.insert_one(t)


async def get_balance(db, user_id: str) -> int:
    w = await db.wallets.find_one({"user_id": user_id})
    return int(w["balance"]) if w else 0


async def credit_wallet(db, user_id: str, amount: int, ttype: str, note: str = None, ref_id: str = None):
    if amount <= 0:
        raise ValueError("Amount must be positive")
    await db.wallets.update_one(
        {"user_id": user_id},
        {"$inc": {"balance": amount}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    await _record_txn(db, user_id, ttype, amount, "in", note, ref_id)


async def debit_wallet(db, user_id: str, amount: int, ttype: str, note: str = None, ref_id: str = None) -> bool:
    if amount <= 0:
        raise ValueError("Amount must be positive")
    w = await db.wallets.find_one({"user_id": user_id})
    if not w or int(w.get("balance", 0)) < amount:
        return False
    await db.wallets.update_one(
        {"user_id": user_id},
        {"$inc": {"balance": -amount}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    await _record_txn(db, user_id, ttype, amount, "out", note, ref_id)
    return True


async def apply_referral(db, new_user_id: str, code: str) -> bool:
    """Apply a referral code at sign-up. Credits both referrer and referee."""
    if not code:
        return False
    code = code.upper().strip()
    ref = await db.referrals.find_one({"code": code})
    if not ref or ref["user_id"] == new_user_id:
        return False
    # update referral doc
    await db.referrals.update_one(
        {"id": ref["id"]},
        {"$addToSet": {"referred_user_ids": new_user_id},
         "$inc": {"total_earned": REFERRAL_BONUS_REFERRER}},
    )
    await credit_wallet(db, ref["user_id"], REFERRAL_BONUS_REFERRER, "referral_bonus",
                        f"Referral bonus — invited a friend ({code})", ref_id=new_user_id)
    await credit_wallet(db, new_user_id, REFERRAL_BONUS_REFEREE, "referral_bonus",
                        f"Welcome bonus — used code {code}", ref_id=ref["user_id"])
    return True


# ---------- Reverse geocode (free, OSM Nominatim) ----------
async def reverse_geocode(lat: float, lon: float) -> dict:
    url = "https://nominatim.openstreetmap.org/reverse"
    params = {"format": "json", "lat": lat, "lon": lon, "addressdetails": 1, "zoom": 16}
    headers = {"User-Agent": "rk-pooja-app/1.0", "Accept": "application/json"}
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            r = await client.get(url, params=params, headers=headers)
            if r.status_code != 200:
                return {"display_name": f"{lat:.4f}, {lon:.4f}"}
            d = r.json()
            addr = d.get("address", {})
            city = addr.get("city") or addr.get("town") or addr.get("village") or addr.get("suburb") or addr.get("county") or ""
            state = addr.get("state", "")
            short = ", ".join([p for p in [
                addr.get("neighbourhood") or addr.get("suburb") or addr.get("road"),
                city, state
            ] if p])
            return {
                "display_name": short or d.get("display_name") or f"{lat:.4f}, {lon:.4f}",
                "address": addr,
                "lat": lat,
                "lon": lon,
            }
    except Exception as e:
        logger.debug("reverse_geocode failed: %s", e)
        return {"display_name": f"{lat:.4f}, {lon:.4f}"}
