"""RK POOJA - Backend API tests (pytest).

Covers: Auth, Inquiries, AI (chat/voice/quote), Admin, Lead scoring.
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://rk-pooja-rides.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@rkpooja.in"
ADMIN_PASSWORD = "admin@123"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


@pytest.fixture(scope="session")
def admin_token(s):
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text}")
    data = r.json()
    assert data["user"]["role"] == "admin"
    return data["token"]


@pytest.fixture(scope="session")
def user_creds():
    uid = uuid.uuid4().hex[:8]
    return {
        "name": f"TEST User {uid}",
        "email": f"TEST_user_{uid}@example.com",
        "phone": "+919999900001",
        "password": "testpass123",
        "language": "en",
    }


@pytest.fixture(scope="session")
def user_token(s, user_creds):
    r = s.post(f"{API}/auth/register", json=user_creds)
    assert r.status_code == 200, r.text
    return r.json()["token"]


# ---------- Health ----------
def test_root(s):
    r = s.get(f"{API}/")
    assert r.status_code == 200
    assert r.json()["app"] == "RK POOJA"


# ---------- Auth ----------
class TestAuth:
    def test_register_creates_user(self, s, user_creds, user_token):
        # user_token fixture already registered; verify response shape via re-login
        r = s.post(f"{API}/auth/login", json={"email": user_creds["email"], "password": user_creds["password"]})
        assert r.status_code == 200
        d = r.json()
        assert "token" in d and isinstance(d["token"], str) and len(d["token"]) > 20
        assert d["user"]["email"] == user_creds["email"].lower()
        assert d["user"]["role"] == "user"

    def test_register_duplicate(self, s, user_creds, user_token):
        r = s.post(f"{API}/auth/register", json=user_creds)
        assert r.status_code == 400

    def test_login_admin(self, admin_token):
        assert admin_token and isinstance(admin_token, str)

    def test_login_invalid(self, s):
        r = s.post(f"{API}/auth/login", json={"email": "nope@nope.in", "password": "wrong"})
        assert r.status_code == 401

    def test_me(self, s, user_token, user_creds):
        r = s.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {user_token}"})
        assert r.status_code == 200
        assert r.json()["email"] == user_creds["email"].lower()

    def test_me_no_token(self, s):
        r = s.get(f"{API}/auth/me")
        assert r.status_code == 401


# ---------- Inquiries ----------
class TestInquiries:
    def test_create_anonymous_inquiry(self, s):
        payload = {
            "service_type": "car",
            "vehicle_category": "Sedan",
            "pickup": "Patna",
            "destination": "Gaya",
            "journey_date": "tomorrow",
            "passengers": 2,
            "customer_name": "TEST Customer",
            "customer_phone": "+919999999991",
            "source": "web",
        }
        r = s.post(f"{API}/inquiries", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["service_type"] == "car"
        assert d["pickup"] == "Patna"
        assert d["destination"] == "Gaya"
        assert d["lead_score"] in ["hot", "warm", "cold"]
        assert d["quote_min"] > 0
        assert d["quote_max"] >= d["quote_min"]
        assert d["distance_km"] > 0
        assert "id" in d
        # Verify persistence via GET
        r2 = s.get(f"{API}/inquiries/{d['id']}")
        assert r2.status_code == 200
        assert r2.json()["id"] == d["id"]

    def test_inquiries_me(self, s, user_token):
        payload = {
            "service_type": "car",
            "vehicle_category": "Sedan",
            "pickup": "Delhi",
            "destination": "Agra",
            "passengers": 3,
            "customer_phone": "+919999900001",
        }
        c = s.post(f"{API}/inquiries", json=payload, headers={"Authorization": f"Bearer {user_token}"})
        assert c.status_code == 200
        r = s.get(f"{API}/inquiries/me", headers={"Authorization": f"Bearer {user_token}"})
        assert r.status_code == 200
        lst = r.json()
        assert isinstance(lst, list) and len(lst) >= 1
        assert any(x["pickup"] == "Delhi" for x in lst)


# ---------- AI ----------
class TestAI:
    def test_quote_car_sedan(self, s):
        r = s.post(f"{API}/ai/quote", json={
            "service_type": "car", "vehicle_category": "Sedan",
            "pickup": "Patna", "destination": "Gaya",
        })
        assert r.status_code == 200
        d = r.json()
        assert d["quote_min"] > 0 and d["quote_max"] >= d["quote_min"]
        assert d["distance_km"] == 110.0
        assert "breakdown" in d

    def test_quote_bus(self, s):
        r = s.post(f"{API}/ai/quote", json={
            "service_type": "bus", "vehicle_category": "Volvo",
            "pickup": "Mumbai", "destination": "Pune",
        })
        assert r.status_code == 200
        assert r.json()["quote_min"] > 5000

    def test_ai_chat(self, s):
        sid = f"TEST-{uuid.uuid4().hex[:8]}"
        r = s.post(f"{API}/ai/chat", json={
            "session_id": sid, "message": "I need a sedan from Patna to Gaya tomorrow", "language": "en",
        }, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert isinstance(d.get("reply"), str) and len(d["reply"].strip()) > 0
        assert d["session_id"] == sid
        # Verify history persisted
        h = s.get(f"{API}/ai/chat/{sid}")
        assert h.status_code == 200
        hist = h.json()
        assert len(hist) >= 2
        roles = [m["role"] for m in hist]
        assert "user" in roles and "assistant" in roles

    def test_voice_parse(self, s):
        r = s.post(f"{API}/ai/voice-parse", json={
            "transcript": "Need a sedan from Patna to Gaya tomorrow",
            "language": "en",
        }, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "error" not in d, f"Voice parse error: {d}"
        assert d.get("service_type") == "car"
        # case-insensitive city match
        assert (d.get("pickup") or "").lower().startswith("patna")
        assert (d.get("destination") or "").lower().startswith("gaya")


# ---------- Lead scoring ----------
class TestLeadScore:
    def test_hot_large_group_bus(self, s):
        payload = {
            "service_type": "bus",
            "vehicle_category": "Volvo",
            "pickup": "Mumbai",
            "destination": "Pune",
            "journey_date": "tomorrow",
            "passengers": 40,
            "customer_phone": "+919999900099",
        }
        r = s.post(f"{API}/inquiries", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["lead_score"] == "hot", f"Expected hot, got {d['lead_score']} ({d.get('lead_score_reason')})"


# ---------- Admin ----------
class TestAdmin:
    def test_stats_requires_admin(self, s):
        r = s.get(f"{API}/admin/stats")
        assert r.status_code in (401, 403)

    def test_stats_with_user_token_forbidden(self, s, user_token):
        r = s.get(f"{API}/admin/stats", headers={"Authorization": f"Bearer {user_token}"})
        assert r.status_code == 403

    def test_admin_stats(self, s, admin_token):
        r = s.get(f"{API}/admin/stats", headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        d = r.json()
        for k in ["total_inquiries", "users", "by_lead_score", "by_status", "by_service", "trend"]:
            assert k in d
        assert isinstance(d["by_lead_score"], dict)
        assert set(["hot", "warm", "cold"]).issubset(d["by_lead_score"].keys())

    def test_admin_list_and_filter(self, s, admin_token):
        r = s.get(f"{API}/admin/inquiries", headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        all_list = r.json()
        assert isinstance(all_list, list)

        r2 = s.get(f"{API}/admin/inquiries?lead_score=hot", headers={"Authorization": f"Bearer {admin_token}"})
        assert r2.status_code == 200
        hot_list = r2.json()
        assert all(x["lead_score"] == "hot" for x in hot_list)

    def test_admin_patch_status(self, s, admin_token):
        # create one to patch
        c = s.post(f"{API}/inquiries", json={
            "service_type": "auto", "pickup": "Patna", "passengers": 1,
            "customer_phone": "+919999900050",
        })
        assert c.status_code == 200
        iid = c.json()["id"]
        r = s.patch(f"{API}/admin/inquiries/{iid}",
                    json={"status": "contacted"},
                    headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        assert r.json()["status"] == "contacted"
