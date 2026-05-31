"""AI services for RK POOJA - chat, voice parsing, lead scoring, quote estimation."""
"""AI services for RK POOJA - chat, voice parsing, lead scoring, quote estimation."""
import os
import json
import re
import logging
import math
import httpx
from typing import Optional, Dict, Any, Tuple
from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger(__name__)


EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
MODEL_PROVIDER = "anthropic"
MODEL_NAME = "claude-sonnet-4-6"


LANGUAGE_NAMES = {
    "en": "English", "hi": "Hindi", "mr": "Marathi", "gu": "Gujarati",
    "bn": "Bengali", "ta": "Tamil", "te": "Telugu", "kn": "Kannada",
    "ml": "Malayalam", "pa": "Punjabi", "or": "Odia", "as": "Assamese",
}


def _chat(session_id: str, system_message: str) -> LlmChat:
    return LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system_message,
    ).with_model(MODEL_PROVIDER, MODEL_NAME)


async def ai_chat_reply(session_id: str, message: str, language: str = "en") -> str:
    """Conversational assistant for RK POOJA users."""
    lang_name = LANGUAGE_NAMES.get(language, "English")
    system = (
        f"You are RK POOJA's AI travel assistant. RK POOJA tagline: 'ONE APP. ALL RIDES.' "
        f"You help Indian customers plan rides across Cars, Autos, Bikes, Tempo Travellers, "
        f"Buses, Porter (parcel/delivery), and Goods Transport. You suggest vehicles, routes, "
        f"approximate fares (INR), and trip plans. You ALWAYS reply in {lang_name}. "
        f"Keep replies short, friendly, India-specific. End with a clear next step like "
        f"'Shall I create an inquiry for you?' or 'Want me to estimate the fare?'. "
        f"Never invent exact prices — always frame as estimated range and say final quote "
        f"comes from RK POOJA support team via WhatsApp."
    )
    chat = _chat(session_id, system)
    try:
        reply = await chat.send_message(UserMessage(text=message))
        return str(reply).strip()
    except Exception as e:
        logger.exception("AI chat failed for session=%s lang=%s: %s", session_id, language, e)
        # one quick retry — most failures are transient
        try:
            reply = await chat.send_message(UserMessage(text=message))
            return str(reply).strip()
        except Exception as e2:
            logger.exception("AI chat retry also failed: %s", e2)
            return "Sorry — I'm having trouble connecting right now. Please tap the green WhatsApp button to reach our team directly."


async def ai_parse_voice(transcript: str, language: str = "en") -> Dict[str, Any]:
    """Extract structured inquiry fields from a voice transcript."""
    lang_name = LANGUAGE_NAMES.get(language, "English")
    system = (
        "You are an information extraction engine for RK POOJA, an Indian transport "
        "marketplace. Given the user's spoken request, extract a JSON object with these "
        "fields (use null if unknown):\n"
        "{\n"
        '  "service_type": "car|auto|bike|tempo|bus|porter|goods",\n'
        '  "sub_service": string|null,\n'
        '  "vehicle_category": string|null,\n'
        '  "pickup": string|null,\n'
        '  "destination": string|null,\n'
        '  "journey_date": "YYYY-MM-DD or natural like \'tomorrow\'"|null,\n'
        '  "journey_time": "HH:MM"|null,\n'
        '  "passengers": int|null,\n'
        '  "weight_kg": number|null,\n'
        '  "goods_type": string|null,\n'
        '  "purpose": string|null,\n'
        '  "summary": short one-line summary in ' + lang_name + "\n"
        "}\n"
        "RULES:\n"
        "- 'sedan/SUV/mini' => service_type='car' with vehicle_category set.\n"
        "- '9/12/17/20/26 seater' or 'traveller/tempo' => service_type='tempo'.\n"
        "- 'bus/volvo/sleeper/coach' => service_type='bus'.\n"
        "- 'parcel/delivery/document/medicine' => service_type='porter'.\n"
        "- 'truck/container/tata ace/pickup' => service_type='goods'.\n"
        "- 'auto/rickshaw' => service_type='auto'.\n"
        "- 'bike/scooter' => service_type='bike'.\n"
        "Return ONLY valid JSON, no prose, no markdown fences."
    )
    chat = _chat(f"voice-parse-{transcript[:20]}", system)
    try:
        reply = await chat.send_message(UserMessage(text=transcript))
        text = str(reply).strip()
        # strip markdown fences if any
        text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.MULTILINE).strip()
        # find json object
        m = re.search(r"\{.*\}", text, re.DOTALL)
        if m:
            text = m.group(0)
        data = json.loads(text)
        return data
    except Exception as e:
        return {"error": str(e), "raw_transcript": transcript}


# ---------- Distance & Quote estimator (deterministic, no LLM needed) ----------
# Approximate inter-city distances; falls back to a heuristic for unknowns.
KNOWN_DISTANCES_KM = {
    ("patna", "gaya"): 110,
    ("delhi", "agra"): 230,
    ("delhi", "jaipur"): 280,
    ("mumbai", "pune"): 150,
    ("mumbai", "nashik"): 165,
    ("bangalore", "mysore"): 145,
    ("bengaluru", "mysuru"): 145,
    ("chennai", "pondicherry"): 170,
    ("hyderabad", "warangal"): 145,
    ("kolkata", "digha"): 185,
    ("ahmedabad", "vadodara"): 110,
    ("lucknow", "kanpur"): 80,
    ("varanasi", "ayodhya"): 220,
    ("patna", "varanasi"): 250,
}


def _norm(s: str) -> str:
    return re.sub(r"[^a-z]", "", (s or "").lower())


# ---------- Real driving distance (OpenStreetMap / OSRM — free, no API key) ----------
async def _geocode(query: str) -> Optional[Tuple[float, float]]:
    """Nominatim geocode (India biased). Returns (lat, lon) or None."""
    if not query:
        return None
    url = "https://nominatim.openstreetmap.org/search"
    params = {"q": query, "format": "json", "limit": 1, "countrycodes": "in"}
    headers = {"User-Agent": "rk-pooja-app/1.0"}
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            r = await client.get(url, params=params, headers=headers)
            if r.status_code != 200:
                return None
            data = r.json()
            if not data:
                return None
            return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception as e:
        logger.debug("geocode failed for %r: %s", query, e)
        return None


def _haversine_km(a: Tuple[float, float], b: Tuple[float, float]) -> float:
    lat1, lon1 = a; lat2, lon2 = b
    R = 6371.0
    p1 = math.radians(lat1); p2 = math.radians(lat2)
    dp = math.radians(lat2 - lat1); dl = math.radians(lon2 - lon1)
    h = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2 * R * math.asin(math.sqrt(h))


async def _osrm_distance_km(a: Tuple[float, float], b: Tuple[float, float]) -> Optional[float]:
    """OSRM public demo server — free road-distance routing."""
    url = f"https://router.project-osrm.org/route/v1/driving/{a[1]},{a[0]};{b[1]},{b[0]}"
    params = {"overview": "false", "alternatives": "false", "steps": "false"}
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(url, params=params)
            if r.status_code != 200:
                return None
            data = r.json()
            routes = data.get("routes") or []
            if not routes:
                return None
            return routes[0]["distance"] / 1000.0
    except Exception as e:
        logger.debug("osrm failed: %s", e)
        return None


async def real_distance_km(pickup: str, destination: Optional[str],
                            pickup_lat: Optional[float] = None, pickup_lon: Optional[float] = None,
                            dest_lat: Optional[float] = None, dest_lon: Optional[float] = None) -> Tuple[float, str]:
    """Return (distance_km, source) using OSRM + OSM if possible, falling back to lookup table.

    source ∈ {'osrm', 'haversine', 'lookup', 'heuristic', 'local'}
    """
    if not destination:
        return 25.0, "local"

    a = (pickup_lat, pickup_lon) if (pickup_lat is not None and pickup_lon is not None) else None
    b = (dest_lat, dest_lon) if (dest_lat is not None and dest_lon is not None) else None
    if not a:
        a = await _geocode(pickup)
    if not b:
        b = await _geocode(destination)

    if a and b:
        d = await _osrm_distance_km(a, b)
        if d and d > 0:
            return round(d, 1), "osrm"
        # fallback to crow-flies * 1.25 road-curvature factor
        return round(_haversine_km(a, b) * 1.25, 1), "haversine"

    # Pure-text fallback
    return estimate_distance_km_text(pickup, destination), "lookup"


def estimate_distance_km_text(pickup: str, destination: Optional[str]) -> float:
    if not destination:
        return 25.0
    a, b = _norm(pickup), _norm(destination)
    if a == b:
        return 25.0
    if (a, b) in KNOWN_DISTANCES_KM:
        return float(KNOWN_DISTANCES_KM[(a, b)])
    if (b, a) in KNOWN_DISTANCES_KM:
        return float(KNOWN_DISTANCES_KM[(b, a)])
    base = 60 + (len(a) + len(b)) * 6
    return float(min(base, 600))


# kept for back-compat with code that still calls it synchronously
def estimate_distance_km(pickup: str, destination: Optional[str]) -> float:
    return estimate_distance_km_text(pickup, destination)


# Per-km rates (INR), and base fare
RATE_TABLE = {
    "bike":   {"base": 25,  "per_km_min": 8,  "per_km_max": 12},
    "auto":   {"base": 35,  "per_km_min": 14, "per_km_max": 20},
    "car":    {
        "Mini Car":        {"base": 100, "per_km_min": 11, "per_km_max": 14},
        "Sedan":           {"base": 150, "per_km_min": 13, "per_km_max": 17},
        "SUV":             {"base": 200, "per_km_min": 16, "per_km_max": 22},
        "Premium SUV":     {"base": 250, "per_km_min": 20, "per_km_max": 28},
        "Luxury Car":      {"base": 400, "per_km_min": 28, "per_km_max": 40},
        "Luxury SUV":      {"base": 500, "per_km_min": 35, "per_km_max": 50},
        "Electric Vehicle":{"base": 120, "per_km_min": 10, "per_km_max": 14},
    },
    "tempo":  {
        "9 Seater":  {"base": 500, "per_km_min": 20, "per_km_max": 26},
        "12 Seater": {"base": 600, "per_km_min": 22, "per_km_max": 28},
        "17 Seater": {"base": 800, "per_km_min": 26, "per_km_max": 34},
        "20 Seater": {"base": 900, "per_km_min": 28, "per_km_max": 36},
        "26 Seater": {"base": 1100,"per_km_min": 32, "per_km_max": 42},
    },
    "bus":    {
        "Mini Bus":      {"base": 2000, "per_km_min": 35, "per_km_max": 45},
        "Traveller Bus": {"base": 2200, "per_km_min": 40, "per_km_max": 50},
        "AC Bus":        {"base": 2800, "per_km_min": 50, "per_km_max": 65},
        "Sleeper Bus":   {"base": 3200, "per_km_min": 55, "per_km_max": 75},
        "Luxury Coach":  {"base": 4500, "per_km_min": 70, "per_km_max": 95},
        "Volvo":         {"base": 5000, "per_km_min": 80, "per_km_max": 110},
        "School Bus":    {"base": 2500, "per_km_min": 45, "per_km_max": 60},
        "Corporate Bus": {"base": 3000, "per_km_min": 50, "per_km_max": 70},
    },
    "porter": {"base": 60,  "per_km_min": 12, "per_km_max": 18},
    "goods":  {
        "Bike":         {"base": 80,  "per_km_min": 12, "per_km_max": 18},
        "Mini Truck":   {"base": 400, "per_km_min": 22, "per_km_max": 30},
        "Tata Ace":     {"base": 500, "per_km_min": 25, "per_km_max": 34},
        "Pickup Truck": {"base": 700, "per_km_min": 30, "per_km_max": 40},
        "Truck":        {"base": 1200,"per_km_min": 45, "per_km_max": 60},
        "Container":    {"base": 2500,"per_km_min": 70, "per_km_max": 95},
    },
}


def estimate_quote(service_type: str, vehicle_category: Optional[str], distance_km: float) -> Dict[str, Any]:
    table = RATE_TABLE.get(service_type, RATE_TABLE["car"])
    rates = table.get(vehicle_category) if isinstance(table, dict) and vehicle_category and vehicle_category in table else None
    if rates is None and isinstance(table, dict) and "base" in table:
        rates = table
    if rates is None and isinstance(table, dict):
        # pick the first option in the dict as default
        first_key = next(iter(table))
        rates = table[first_key]
    base = rates["base"]
    pkm_min = rates["per_km_min"]
    pkm_max = rates["per_km_max"]
    qmin = int(base + pkm_min * distance_km)
    qmax = int(base + pkm_max * distance_km)
    # round to nearest 50
    qmin = (qmin // 50) * 50
    qmax = ((qmax + 49) // 50) * 50
    return {
        "quote_min": qmin,
        "quote_max": qmax,
        "distance_km": round(distance_km, 1),
        "breakdown": {"base": base, "per_km_min": pkm_min, "per_km_max": pkm_max},
    }


# ---------- Lead scoring (deterministic) ----------
def score_lead(inquiry: dict) -> Dict[str, Any]:
    """Hot / Warm / Cold based on rules."""
    points = 0
    reasons = []

    # Journey date proximity
    jd = inquiry.get("journey_date")
    if jd:
        if any(w in jd.lower() for w in ["today", "tonight", "now", "asap", "tomorrow"]):
            points += 3
            reasons.append("Imminent travel date")
        else:
            points += 1

    # Passenger group size
    pax = inquiry.get("passengers") or 0
    try:
        pax = int(pax)
    except Exception:
        pax = 0
    if pax >= 20:
        points += 3
        reasons.append("Large group (20+)")
    elif pax >= 10:
        points += 2
        reasons.append("Group booking (10+)")
    elif pax >= 4:
        points += 1

    # Premium vehicle category
    vc = (inquiry.get("vehicle_category") or "").lower()
    if any(w in vc for w in ["luxury", "volvo", "premium", "coach", "container", "sleeper"]):
        points += 2
        reasons.append("Premium vehicle requested")

    # Service type heavy lifters
    st = inquiry.get("service_type")
    if st in ["bus", "tempo", "goods"]:
        points += 1

    # Urgency or purpose hints
    urg = (inquiry.get("urgency") or "").lower()
    if "same" in urg or "urgent" in urg or "express" in urg:
        points += 2
        reasons.append("Urgent delivery")
    purpose = (inquiry.get("purpose") or "").lower()
    if any(w in purpose for w in ["wedding", "corporate", "pilgrimage", "event"]):
        points += 1
        reasons.append("High-value occasion")

    # Customer left phone/email
    if inquiry.get("customer_phone"):
        points += 1

    if points >= 6:
        score = "hot"
    elif points >= 3:
        score = "warm"
    else:
        score = "cold"

    return {"lead_score": score, "lead_score_reason": ", ".join(reasons) or "Standard inquiry"}
