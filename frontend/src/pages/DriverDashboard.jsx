import { useEffect, useState, useRef } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "../lib/auth-context";
import { api } from "../lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Switch } from "../components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import {
  Car, MapPin, Clock, Star, Phone, CheckCircle2, XCircle, Loader2,
  Wallet as WalletIcon, ShieldCheck, AlertTriangle, MessageCircle, ListChecks,
} from "lucide-react";
import { toast } from "sonner";
import { WalletPanel } from "../components/WalletPanel";
import { ReferralPanel } from "../components/ReferralPanel";
import { KycUploader } from "../components/KycUploader";
import { buildInquiryWhatsApp } from "../lib/whatsapp";

export default function DriverDashboard() {
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState(null);
  const [feed, setFeed] = useState([]);
  const [accepted, setAccepted] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [busy, setBusy] = useState({});
  const pollRef = useRef(null);
  const geoRef = useRef(null);

  const load = async () => {
    try {
      const [me, fd, mine, rt] = await Promise.all([
        api.get("/driver/me"),
        api.get("/driver/inquiries").catch(() => ({ data: [] })),
        api.get("/driver/inquiries/mine").catch(() => ({ data: [] })),
        api.get("/driver/ratings").catch(() => ({ data: [] })),
      ]);
      setProfile(me.data.profile);
      setFeed(fd.data);
      setAccepted(mine.data);
      setRatings(rt.data);
    } catch (e) {
      // user may not be a driver yet
    }
  };

  useEffect(() => { if (user?.role === "driver" || user?.role === "admin") load(); /* eslint-disable-next-line */ }, [user]);

  // Poll feed while online
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (profile?.online) {
      pollRef.current = setInterval(async () => {
        const fd = await api.get("/driver/inquiries").catch(() => ({ data: [] }));
        setFeed(fd.data);
      }, 8000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [profile?.online]);

  // Push GPS while online
  useEffect(() => {
    if (geoRef.current) { clearInterval(geoRef.current); geoRef.current = null; }
    if (profile?.online && navigator.geolocation) {
      const push = () => {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          try {
            await api.post("/driver/location", { lat: pos.coords.latitude, lon: pos.coords.longitude });
            setProfile((p) => p && ({ ...p, current_lat: pos.coords.latitude, current_lon: pos.coords.longitude }));
          } catch {}
        }, () => {}, { timeout: 10000, maximumAge: 60000, enableHighAccuracy: false });
      };
      push();
      geoRef.current = setInterval(push, 30000);
    }
    return () => { if (geoRef.current) clearInterval(geoRef.current); };
  }, [profile?.online]);

  if (loading) return <div className="p-10 text-center text-rk-muted">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "driver" && user.role !== "admin") {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center">
        <h2 className="font-heading font-extrabold text-2xl text-rk-navy">You're not registered as a partner yet.</h2>
        <p className="text-rk-muted mt-2">Sign up as a driver to view the partner dashboard.</p>
        <Button asChild className="mt-4 bg-rk-orange hover:bg-rk-orange-600 text-white rounded-full">
          <Link to="/driver/signup">Become a partner</Link>
        </Button>
      </div>
    );
  }

  const toggleOnline = async (next) => {
    try {
      await api.post("/driver/status", { online: next });
      setProfile((p) => p && ({ ...p, online: next }));
      toast.success(next ? "You are now online — receiving leads" : "You are offline");
    } catch { toast.error("Could not update status"); }
  };

  const onAccept = async (id) => {
    setBusy((b) => ({ ...b, [id]: "accept" }));
    try {
      await api.post(`/driver/inquiries/${id}/accept`);
      toast.success("Inquiry accepted! Reach out to the customer.");
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not accept");
    } finally {
      setBusy((b) => ({ ...b, [id]: null }));
    }
  };

  const onReject = async (id) => {
    setBusy((b) => ({ ...b, [id]: "reject" }));
    try {
      await api.post(`/driver/inquiries/${id}/reject`);
      setFeed((f) => f.filter((x) => x.id !== id));
    } catch { toast.error("Failed to reject"); }
    finally { setBusy((b) => ({ ...b, [id]: null })); }
  };

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="driver-dashboard">
      <DriverHeader profile={profile} ratingsCount={ratings.length} onToggle={toggleOnline} />

      <Tabs defaultValue="feed" className="mt-8">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="feed" data-testid="driver-tab-feed">Live feed ({feed.length})</TabsTrigger>
          <TabsTrigger value="accepted" data-testid="driver-tab-accepted">My rides ({accepted.length})</TabsTrigger>
          <TabsTrigger value="kyc" data-testid="driver-tab-kyc">KYC & Vehicle</TabsTrigger>
          <TabsTrigger value="wallet" data-testid="driver-tab-wallet">Wallet</TabsTrigger>
          <TabsTrigger value="referral" data-testid="driver-tab-referral">Refer drivers</TabsTrigger>
          <TabsTrigger value="ratings" data-testid="driver-tab-ratings">Ratings ({ratings.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="mt-6">
          {!profile?.online ? (
            <Card><CardContent className="p-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-rk-orange/10 text-rk-orange grid place-items-center mx-auto"><AlertTriangle size={22} /></div>
              <h3 className="font-heading font-bold text-xl text-rk-navy mt-3">You are offline</h3>
              <p className="text-rk-muted mt-1 text-sm max-w-md mx-auto">Turn on the online toggle above to start receiving live inquiries matching your vehicle.</p>
            </CardContent></Card>
          ) : feed.length === 0 ? (
            <Card><CardContent className="p-10 text-center">
              <Loader2 size={20} className="animate-spin mx-auto text-rk-muted" />
              <p className="text-rk-muted mt-3 text-sm">Watching for new inquiries… Polls every 8 seconds.</p>
            </CardContent></Card>
          ) : (
            <div className="grid lg:grid-cols-2 gap-4" data-testid="driver-feed">
              {feed.map((inq) => (
                <FeedCard key={inq.id} inq={inq} busy={busy[inq.id]} onAccept={onAccept} onReject={onReject} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="accepted" className="mt-6">
          {accepted.length === 0 ? (
            <Card><CardContent className="p-10 text-center text-rk-muted">No accepted rides yet.</CardContent></Card>
          ) : (
            <div className="grid lg:grid-cols-2 gap-4" data-testid="driver-accepted">
              {accepted.map((inq) => <AcceptedCard key={inq.id} inq={inq} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="kyc" className="mt-6">
          <KycPanel profile={profile} onSaved={load} />
        </TabsContent>

        <TabsContent value="wallet" className="mt-6">
          <WalletPanel />
        </TabsContent>

        <TabsContent value="referral" className="mt-6">
          <ReferralPanel />
        </TabsContent>

        <TabsContent value="ratings" className="mt-6">
          <RatingsPanel ratings={ratings} avg={profile?.rating_avg} count={profile?.rating_count} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DriverHeader({ profile, ratingsCount, onToggle }) {
  const kyc = profile?.kyc_status || "pending";
  const kycColor = kyc === "approved" ? "#16A34A" : kyc === "rejected" ? "#DC2626" : "#F59E0B";
  return (
    <div className="rounded-2xl bg-rk-navy text-white p-6 sm:p-7 relative overflow-hidden" data-testid="driver-header">
      <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-rk-orange/20 blur-3xl" />
      <div className="relative flex flex-wrap gap-6 items-start justify-between">
        <div>
          <div className="text-xs uppercase font-bold tracking-widest text-rk-orange">Partner dashboard</div>
          <h1 className="font-heading font-extrabold text-3xl mt-1">Drive · Earn · Repeat</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <Badge style={{ background: kycColor }} className="uppercase font-bold tracking-widest text-[10px]">
              <ShieldCheck size={12} className="mr-1" /> KYC: {kyc}
            </Badge>
            {profile?.vehicle_type && (
              <span className="bg-white/10 border border-white/20 px-3 py-1 rounded-full text-xs">
                <Car size={12} className="inline mr-1" /> {profile.vehicle_type.toUpperCase()}
                {profile.vehicle_category && ` · ${profile.vehicle_category}`}
                {profile.vehicle_number && ` · ${profile.vehicle_number}`}
              </span>
            )}
            <span className="bg-white/10 border border-white/20 px-3 py-1 rounded-full text-xs">
              <Star size={12} className="inline mr-1 text-rk-orange" fill="currentColor" />
              {profile?.rating_avg?.toFixed?.(1) || "—"} · {profile?.rating_count || 0} ratings
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-3 bg-white/5 border border-white/15 rounded-full px-4 py-2">
            <span className={`w-2.5 h-2.5 rounded-full ${profile?.online ? "bg-green-400" : "bg-slate-400"}`} />
            <span className="font-semibold text-sm">{profile?.online ? "ONLINE" : "OFFLINE"}</span>
            <Switch checked={!!profile?.online} onCheckedChange={onToggle} data-testid="driver-online-switch" />
          </div>
          {profile?.current_lat && (
            <div className="text-[10px] text-white/50 font-mono">
              GPS: {profile.current_lat.toFixed(3)}, {profile.current_lon?.toFixed(3)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FeedCard({ inq, busy, onAccept, onReject }) {
  return (
    <div className="rounded-2xl border border-rk-border bg-white p-5" data-testid={`feed-card-${inq.id}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase font-bold tracking-widest text-rk-orange">
            {inq.service_type} {inq.vehicle_category && `· ${inq.vehicle_category}`}
          </div>
          <div className="font-heading font-bold text-rk-navy mt-1 flex items-center gap-2">
            <MapPin size={14} className="text-rk-orange" /> {inq.pickup} → {inq.destination || "—"}
          </div>
          <div className="text-xs text-rk-muted mt-1 flex items-center gap-3">
            {inq.journey_date && <span className="flex items-center gap-1"><Clock size={11} /> {inq.journey_date}</span>}
            {inq.passengers && <span>{inq.passengers} pax</span>}
            {inq.distance_km && <span>~{inq.distance_km} km</span>}
            {inq.driver_pickup_km != null && (
              <span className="font-semibold text-rk-navy">{inq.driver_pickup_km} km away</span>
            )}
          </div>
        </div>
        <Badge style={{
          background: inq.lead_score === "hot" ? "#FF7A00" : inq.lead_score === "warm" ? "#F59E0B" : "#3B82F6",
          color: "white"
        }} className="uppercase font-bold tracking-widest text-[10px]">{inq.lead_score}</Badge>
      </div>

      {inq.quote_min && (
        <div className="mt-3 font-heading font-extrabold text-2xl text-rk-navy">
          ₹{inq.quote_min.toLocaleString()} – ₹{inq.quote_max.toLocaleString()}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <Button onClick={() => onAccept(inq.id)} disabled={!!busy}
          className="flex-1 bg-rk-orange hover:bg-rk-orange-600 text-white rounded-full"
          data-testid={`accept-${inq.id}`}>
          {busy === "accept" ? <Loader2 size={14} className="animate-spin" /> : <><CheckCircle2 size={14} className="mr-1" /> Accept</>}
        </Button>
        <Button onClick={() => onReject(inq.id)} disabled={!!busy} variant="outline" className="rounded-full"
          data-testid={`reject-${inq.id}`}>
          {busy === "reject" ? <Loader2 size={14} className="animate-spin" /> : <><XCircle size={14} className="mr-1" /> Skip</>}
        </Button>
      </div>
    </div>
  );
}

function AcceptedCard({ inq }) {
  const wa = inq.customer_phone
    ? buildInquiryWhatsApp({ inquiry: inq, number: inq.customer_phone })
    : null;
  return (
    <div className="rounded-2xl border border-rk-border bg-white p-5">
      <div className="text-xs uppercase font-bold tracking-widest text-rk-orange">
        {inq.service_type} {inq.vehicle_category && `· ${inq.vehicle_category}`}
      </div>
      <div className="font-heading font-bold text-rk-navy mt-1 flex items-center gap-2">
        <MapPin size={14} className="text-rk-orange" /> {inq.pickup} → {inq.destination || "—"}
      </div>
      <div className="text-xs text-rk-muted mt-1">
        {inq.journey_date} · {inq.passengers} pax · Status: <b className="text-rk-ink uppercase">{inq.status}</b>
      </div>
      <div className="mt-3 text-sm">
        <div><b>Customer:</b> {inq.customer_name || "—"}</div>
        <div><b>Phone:</b> {inq.customer_phone || "—"}</div>
      </div>
      {wa && (
        <a href={wa} target="_blank" rel="noreferrer"
           className="mt-3 inline-flex items-center gap-2 bg-[#25D366] text-white rounded-full px-4 py-2 text-sm font-semibold">
          <MessageCircle size={14} /> Contact customer
        </a>
      )}
    </div>
  );
}

function KycPanel({ profile, onSaved }) {
  const [form, setForm] = useState(() => ({
    aadhaar_number: profile?.aadhaar_number || "",
    dl_number: profile?.dl_number || "",
    pan_number: profile?.pan_number || "",
    vehicle_type: profile?.vehicle_type || "car",
    vehicle_category: profile?.vehicle_category || "",
    vehicle_number: profile?.vehicle_number || "",
    vehicle_model: profile?.vehicle_model || "",
    vehicle_year: profile?.vehicle_year || "",
    rc_number: profile?.rc_number || "",
    insurance_expiry: profile?.insurance_expiry || "",
    base_city: profile?.base_city || "",
    service_radius_km: profile?.service_radius_km || 50,
  }));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        aadhaar_number: profile.aadhaar_number || "",
        dl_number: profile.dl_number || "",
        pan_number: profile.pan_number || "",
        vehicle_type: profile.vehicle_type || "car",
        vehicle_category: profile.vehicle_category || "",
        vehicle_number: profile.vehicle_number || "",
        vehicle_model: profile.vehicle_model || "",
        vehicle_year: profile.vehicle_year || "",
        rc_number: profile.rc_number || "",
        insurance_expiry: profile.insurance_expiry || "",
        base_city: profile.base_city || "",
        service_radius_km: profile.service_radius_km || 50,
      });
    }
  }, [profile]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form };
      if (payload.vehicle_year) payload.vehicle_year = Number(payload.vehicle_year);
      if (payload.service_radius_km) payload.service_radius_km = Number(payload.service_radius_km);
      await api.patch("/driver/me", payload);
      toast.success("Saved. Admin will review your KYC shortly.");
      onSaved();
    } catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-3xl space-y-5" data-testid="kyc-panel">
      {profile?.kyc_status === "rejected" && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          <b>KYC rejected.</b> {profile?.kyc_notes || "Please review and resubmit."}
        </div>
      )}
      <div className="rounded-2xl border border-rk-border bg-white p-6">
        <h3 className="font-heading font-bold text-xl text-rk-navy">KYC documents</h3>
        <p className="text-xs text-rk-muted mt-1">Numbers only for now — physical doc uploads coming after admin approval.</p>
        <div className="grid sm:grid-cols-3 gap-4 mt-5">
          <Field label="Aadhaar #" value={form.aadhaar_number} onChange={(v) => setForm({ ...form, aadhaar_number: v })} testId="kyc-aadhaar" />
          <Field label="Driving Licence #" value={form.dl_number} onChange={(v) => setForm({ ...form, dl_number: v })} testId="kyc-dl" />
          <Field label="PAN #" value={form.pan_number} onChange={(v) => setForm({ ...form, pan_number: v })} testId="kyc-pan" />
        </div>
      </div>

      <div className="rounded-2xl border border-rk-border bg-white p-6">
        <h3 className="font-heading font-bold text-xl text-rk-navy">Vehicle</h3>
        <div className="grid sm:grid-cols-3 gap-4 mt-5">
          <div>
            <Label className="text-xs uppercase tracking-widest font-bold text-rk-muted">Type</Label>
            <Select value={form.vehicle_type} onValueChange={(v) => setForm({ ...form, vehicle_type: v })}>
              <SelectTrigger className="h-12 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["car","auto","bike","tempo","bus","truck"].map((v) => <SelectItem key={v} value={v}>{v.toUpperCase()}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Field label="Category" value={form.vehicle_category} onChange={(v) => setForm({ ...form, vehicle_category: v })} placeholder="Sedan / 17 Seater…" testId="kyc-cat" />
          <Field label="Plate number" value={form.vehicle_number} onChange={(v) => setForm({ ...form, vehicle_number: v.toUpperCase() })} testId="kyc-plate" />
          <Field label="Model" value={form.vehicle_model} onChange={(v) => setForm({ ...form, vehicle_model: v })} testId="kyc-model" />
          <Field label="Year" type="number" value={form.vehicle_year} onChange={(v) => setForm({ ...form, vehicle_year: v })} testId="kyc-year" />
          <Field label="RC #" value={form.rc_number} onChange={(v) => setForm({ ...form, rc_number: v })} testId="kyc-rc" />
          <Field label="Insurance expiry" type="date" value={form.insurance_expiry} onChange={(v) => setForm({ ...form, insurance_expiry: v })} testId="kyc-ins" />
          <Field label="Base city" value={form.base_city} onChange={(v) => setForm({ ...form, base_city: v })} testId="kyc-city" />
          <Field label="Service radius (km)" type="number" value={form.service_radius_km} onChange={(v) => setForm({ ...form, service_radius_km: v })} testId="kyc-radius" />
        </div>
      </div>

      <div className="rounded-2xl border border-rk-border bg-white p-6">
        <h3 className="font-heading font-bold text-xl text-rk-navy">Upload documents</h3>
        <p className="text-xs text-rk-muted mt-1">Upload clear photos / PDFs. Admin will review and approve.</p>
        <div className="grid sm:grid-cols-2 gap-3 mt-4">
          {["aadhaar","dl","pan","rc","insurance","vehicle_photo"].map((dt) => (
            <KycUploader
              key={dt}
              docType={dt}
              existing={profile?.kyc_docs?.[dt]}
              onUploaded={onSaved}
            />
          ))}
        </div>
      </div>

      <Button onClick={save} disabled={saving}
        className="bg-rk-orange hover:bg-rk-orange-600 text-white rounded-full h-12 px-7 font-bold" data-testid="kyc-save">
        {saving ? <Loader2 size={14} className="animate-spin" /> : "Save & submit for review"}
      </Button>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, testId }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-widest font-bold text-rk-muted">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="h-12 mt-1" data-testid={testId} />
    </div>
  );
}

function RatingsPanel({ ratings, avg, count }) {
  return (
    <div className="max-w-2xl">
      <div className="rounded-2xl bg-gradient-to-br from-rk-orange to-rk-orange-600 text-white p-6">
        <div className="text-xs uppercase font-bold tracking-widest text-white/80">Your rating</div>
        <div className="font-heading font-black text-5xl mt-2 flex items-center gap-3">
          {avg?.toFixed?.(1) || "—"}
          <Star size={28} fill="currentColor" />
        </div>
        <div className="text-sm text-white/90 mt-1">from {count || 0} customer ratings</div>
      </div>
      <div className="mt-5 space-y-3">
        {ratings.length === 0 ? (
          <div className="rounded-xl bg-white border border-rk-border p-6 text-center text-rk-muted">No ratings yet.</div>
        ) : ratings.map((r) => (
          <div key={r.id} className="rounded-xl bg-white border border-rk-border p-4">
            <div className="flex text-rk-orange">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={14} fill={i < r.stars ? "currentColor" : "none"} />
              ))}
            </div>
            {r.comment && <p className="text-sm mt-2 text-rk-ink">"{r.comment}"</p>}
            <div className="text-xs text-rk-muted mt-1">{(r.created_at || "").slice(0,10)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
