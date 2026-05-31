"""Driver-side logic: matching inquiries to drivers, GPS, ratings, signup bonus."""
import os
import math
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from models import DriverProfileDoc

logger = logging.getLogger(__name__)

DRIVER_SIGNUP_BONUS = int(os.environ.get("DRIVER_SIGNUP_BONUS", "500"))
DRIVER_REFERRAL_BONUS = int(os.environ.get("DRIVER_REFERRAL_BONUS", "500"))


SERVICE_TYPE_TO_VEHICLE = {
    "car": ["car"],
    "auto": ["auto"],
    "bike": ["bike"],
    "tempo": ["tempo"],
    "bus": ["bus"],
    "porter": ["bike", "auto", "car"],
    "goods": ["bike", "car", "truck"],
}


def _haversine_km(a: tuple, b: tuple) -> float:
    lat1, lon1 = a; lat2, lon2 = b
    R = 6371.0
    p1 = math.radians(lat1); p2 = math.radians(lat2)
    dp = math.radians(lat2 - lat1); dl = math.radians(lon2 - lon1)
    h = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2 * R * math.asin(math.sqrt(h))


async def ensure_driver_profile(db, user_id: str) -> dict:
    existing = await db.driver_profiles.find_one({"user_id": user_id}, {"_id": 0})
    if existing:
        return existing
    profile = DriverProfileDoc(user_id=user_id).model_dump()
    profile["created_at"] = profile["created_at"].isoformat()
    profile["updated_at"] = profile["updated_at"].isoformat()
    await db.driver_profiles.insert_one(profile)
    return profile


async def update_driver_profile(db, user_id: str, fields: dict) -> dict:
    fields = {k: v for k, v in fields.items() if v is not None}
    fields["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.driver_profiles.update_one({"user_id": user_id}, {"$set": fields}, upsert=True)
    return await db.driver_profiles.find_one({"user_id": user_id}, {"_id": 0})


async def get_matching_inquiries(db, driver: dict, limit: int = 30) -> List[dict]:
    """Return inquiries that match this driver's vehicle type, in 'new' status."""
    vtype = driver.get("vehicle_type")
    if not vtype:
        return []

    # find which service_types map to this vehicle type
    matching_services = [s for s, vs in SERVICE_TYPE_TO_VEHICLE.items() if vtype in vs]
    if not matching_services:
        matching_services = [vtype]

    query = {
        "status": "new",
        "service_type": {"$in": matching_services},
        "$or": [
            {"assigned_driver_id": {"$exists": False}},
            {"assigned_driver_id": None},
        ],
    }
    cur = db.inquiries.find(query, {"_id": 0}).sort("created_at", -1).limit(limit)
    inquiries = await cur.to_list(limit)

    # compute distance from driver if both have coords
    dlat = driver.get("current_lat")
    dlon = driver.get("current_lon")
    for inq in inquiries:
        if dlat is not None and dlon is not None and inq.get("pickup_lat") and inq.get("pickup_lon"):
            inq["driver_pickup_km"] = round(
                _haversine_km((dlat, dlon), (inq["pickup_lat"], inq["pickup_lon"])), 1
            )
        else:
            inq["driver_pickup_km"] = None

    # Sort by distance asc (None last), then by created_at desc
    inquiries.sort(key=lambda i: (i["driver_pickup_km"] is None, i["driver_pickup_km"] or 0))
    return inquiries


async def accept_inquiry(db, inquiry_id: str, driver_user_id: str) -> Optional[dict]:
    """Atomic accept: only first driver wins."""
    res = await db.inquiries.find_one_and_update(
        {
            "id": inquiry_id,
            "status": "new",
            "$or": [
                {"assigned_driver_id": {"$exists": False}},
                {"assigned_driver_id": None},
            ],
        },
        {"$set": {
            "assigned_driver_id": driver_user_id,
            "status": "contacted",
            "accepted_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        projection={"_id": 0},
        return_document=True,  # type: ignore
    )
    return res


async def update_driver_rating(db, driver_user_id: str, stars: int):
    """Maintain rolling average rating on driver profile."""
    profile = await db.driver_profiles.find_one({"user_id": driver_user_id})
    if not profile:
        return
    count = int(profile.get("rating_count", 0))
    avg = float(profile.get("rating_avg", 0.0))
    new_count = count + 1
    new_avg = (avg * count + stars) / new_count
    await db.driver_profiles.update_one(
        {"user_id": driver_user_id},
        {"$set": {
            "rating_count": new_count,
            "rating_avg": round(new_avg, 2),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
