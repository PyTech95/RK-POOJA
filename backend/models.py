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
    passengers: Optional[int] = None
    weight_kg: Optional[float] = None
    journey_date: Optional[str] = None


class QuoteResponse(BaseModel):
    quote_min: int
    quote_max: int
    distance_km: float
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
