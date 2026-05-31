"""Pydantic models for RK POOJA."""
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, EmailStr, ConfigDict
import uuid


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def new_id() -> str:
    return str(uuid.uuid4())


# ---------- User ----------
class UserBase(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    language: str = "en"
    role: str = "user"  # user | admin


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    password: str
    language: Optional[str] = "en"
    referral_code: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserPublic(UserBase):
    id: str


class UserDoc(UserBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=new_id)
    password_hash: str
    created_at: datetime = Field(default_factory=utc_now)


# ---------- Inquiry ----------
class InquiryCreate(BaseModel):
    service_type: str  # car | auto | bike | tempo | bus | porter | goods
    sub_service: Optional[str] = None  # e.g., "Outstation One-Way"
    vehicle_category: Optional[str] = None  # e.g., "Sedan", "17 Seater"
    pickup: str
    destination: Optional[str] = None
    pickup_lat: Optional[float] = None
    pickup_lon: Optional[float] = None
    dest_lat: Optional[float] = None
    dest_lon: Optional[float] = None
    journey_date: Optional[str] = None  # ISO date string
    return_date: Optional[str] = None
    journey_time: Optional[str] = None
    passengers: Optional[int] = None
    weight_kg: Optional[float] = None
    goods_type: Optional[str] = None
    package_type: Optional[str] = None
    urgency: Optional[str] = None
    purpose: Optional[str] = None
    special_requirements: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    language: Optional[str] = "en"
    source: Optional[str] = "web"  # web | voice | chat


class InquiryDoc(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=new_id)
    user_id: Optional[str] = None
    service_type: str
    sub_service: Optional[str] = None
    vehicle_category: Optional[str] = None
    pickup: str
    destination: Optional[str] = None
    pickup_lat: Optional[float] = None
    pickup_lon: Optional[float] = None
    dest_lat: Optional[float] = None
    dest_lon: Optional[float] = None
    journey_date: Optional[str] = None
    return_date: Optional[str] = None
    journey_time: Optional[str] = None
    passengers: Optional[int] = None
    weight_kg: Optional[float] = None
    goods_type: Optional[str] = None
    package_type: Optional[str] = None
    urgency: Optional[str] = None
    purpose: Optional[str] = None
    special_requirements: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    language: str = "en"
    source: str = "web"

    # AI fields
    lead_score: str = "warm"  # hot | warm | cold
    lead_score_reason: Optional[str] = None
    quote_min: Optional[int] = None
    quote_max: Optional[int] = None
    distance_km: Optional[float] = None
    distance_source: Optional[str] = None  # 'osrm' | 'haversine' | 'lookup' | 'local'

    # Workflow
    status: str = "new"  # new | contacted | quoted | converted | closed
    notes: Optional[str] = None
    whatsapp_sent: bool = False

    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class InquiryUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    lead_score: Optional[str] = None


# ---------- AI ----------
class AIChatRequest(BaseModel):
    session_id: str
    message: str
    language: str = "en"


class AIChatResponse(BaseModel):
    reply: str
    session_id: str


class VoiceParseRequest(BaseModel):
    transcript: str
    language: str = "en"


class QuoteRequest(BaseModel):
    service_type: str
    vehicle_category: Optional[str] = None
    pickup: str
    destination: Optional[str] = None
    pickup_lat: Optional[float] = None
    pickup_lon: Optional[float] = None
    dest_lat: Optional[float] = None
    dest_lon: Optional[float] = None
    passengers: Optional[int] = None
    weight_kg: Optional[float] = None
    journey_date: Optional[str] = None


class QuoteResponse(BaseModel):
    quote_min: int
    quote_max: int
    distance_km: float
    distance_source: Optional[str] = None
    breakdown: Dict[str, Any]


# ---------- Chat message persistence ----------
class ChatMessageDoc(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=new_id)
    session_id: str
    user_id: Optional[str] = None
    role: str  # user | assistant
    content: str
    language: str = "en"
    created_at: datetime = Field(default_factory=utc_now)


# ---------- Wallet & Transactions ----------
class WalletDoc(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=new_id)
    user_id: str
    balance: int = 0  # paise? we use INR rupees for simplicity
    currency: str = "INR"
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class TransactionDoc(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=new_id)
    user_id: str
    type: str  # topup | debit | credit | referral_bonus | admin_credit
    amount: int  # positive integer in INR
    direction: str  # in | out
    note: Optional[str] = None
    ref_id: Optional[str] = None  # inquiry id / referral id etc.
    created_at: datetime = Field(default_factory=utc_now)


class WalletTopupRequest(BaseModel):
    amount: int


class WalletCreditRequest(BaseModel):
    user_id: str
    amount: int
    note: Optional[str] = None


# ---------- Referral ----------
class ReferralDoc(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=new_id)
    user_id: str
    code: str  # short, uppercase
    referred_user_ids: list = Field(default_factory=list)
    total_earned: int = 0
    role: str = "user"  # user | driver
    created_at: datetime = Field(default_factory=utc_now)


class ApplyReferralRequest(BaseModel):
    code: str


# ---------- Geo ----------
class ReverseGeoRequest(BaseModel):
    lat: float
    lon: float


# ---------- Driver ----------
class DriverProfileDoc(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=new_id)
    user_id: str  # links to User
    # KYC
    aadhaar_number: Optional[str] = None
    dl_number: Optional[str] = None  # driving licence
    pan_number: Optional[str] = None
    # Vehicle
    vehicle_type: Optional[str] = None  # car | auto | bike | tempo | bus | truck
    vehicle_category: Optional[str] = None  # Sedan, 17 Seater etc.
    vehicle_number: Optional[str] = None  # plate
    vehicle_model: Optional[str] = None
    vehicle_year: Optional[int] = None
    rc_number: Optional[str] = None
    insurance_expiry: Optional[str] = None
    # City / service area
    base_city: Optional[str] = None
    service_radius_km: Optional[int] = 50
    # Status
    kyc_status: str = "pending"  # pending | approved | rejected
    kyc_notes: Optional[str] = None
    online: bool = False
    # GPS
    current_lat: Optional[float] = None
    current_lon: Optional[float] = None
    last_location_at: Optional[str] = None
    # Aggregates
    total_rides: int = 0
    rating_avg: float = 0.0
    rating_count: int = 0
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class DriverSignupRequest(BaseModel):
    name: str
    email: EmailStr
    phone: str
    password: str
    vehicle_type: str
    vehicle_category: Optional[str] = None
    vehicle_number: Optional[str] = None
    base_city: Optional[str] = None
    referral_code: Optional[str] = None
    language: Optional[str] = "en"


class DriverProfileUpdate(BaseModel):
    aadhaar_number: Optional[str] = None
    dl_number: Optional[str] = None
    pan_number: Optional[str] = None
    vehicle_type: Optional[str] = None
    vehicle_category: Optional[str] = None
    vehicle_number: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_year: Optional[int] = None
    rc_number: Optional[str] = None
    insurance_expiry: Optional[str] = None
    base_city: Optional[str] = None
    service_radius_km: Optional[int] = None


class DriverStatusRequest(BaseModel):
    online: bool


class DriverLocationRequest(BaseModel):
    lat: float
    lon: float


class DriverKycReviewRequest(BaseModel):
    status: str  # approved | rejected
    notes: Optional[str] = None


class RatingDoc(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=new_id)
    inquiry_id: str
    rater_user_id: str  # customer
    driver_user_id: str
    stars: int  # 1-5
    comment: Optional[str] = None
    created_at: datetime = Field(default_factory=utc_now)


class RatingRequest(BaseModel):
    inquiry_id: str
    stars: int
    comment: Optional[str] = None

