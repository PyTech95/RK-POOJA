import { useEffect, useState } from "react";
import { Navigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth-context";
import { useLang } from "../lib/language-context";
import { api } from "../lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { MessageCircle, MapPin, Calendar, Loader2 } from "lucide-react";
import { buildInquiryWhatsApp } from "../lib/whatsapp";
import { toast } from "sonner";

export default function Dashboard() {
  const { user, refresh } = useAuth();
  const { t, lang, setLang, languages } = useLang();
  const [params] = useSearchParams();
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({ name: "", phone: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) setProfile({ name: user.name, phone: user.phone || "" });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    api.get("/inquiries/me").then((r) => setInquiries(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await api.patch("/auth/me", { ...profile, language: lang });
      await refresh();
      toast.success("Profile updated");
    } catch {
      toast.error("Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (!user) return <Navigate to="/login" replace />;

  const defaultTab = params.get("tab") === "profile" ? "profile" : "inquiries";

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10" data-testid="dashboard-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase font-bold tracking-widest text-rk-orange">Welcome</div>
          <h1 className="font-heading font-extrabold text-3xl sm:text-4xl text-rk-navy mt-1 tracking-tight">
            Hi, {user.name.split(" ")[0]}
          </h1>
          <p className="text-rk-muted mt-1 text-sm">Manage your inquiries, profile and preferences.</p>
        </div>
        <Button asChild className="bg-rk-orange hover:bg-rk-orange-600 text-white rounded-full">
          <Link to="/" data-testid="dashboard-new-inquiry">+ New inquiry</Link>
        </Button>
      </div>

      <Tabs defaultValue={defaultTab} className="mt-8">
        <TabsList data-testid="dashboard-tabs">
          <TabsTrigger value="inquiries" data-testid="tab-inquiries">{t("my_inquiries")} ({inquiries.length})</TabsTrigger>
          <TabsTrigger value="profile" data-testid="tab-profile">{t("profile")}</TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings">{t("settings")}</TabsTrigger>
        </TabsList>

        <TabsContent value="inquiries" className="mt-6">
          {loading ? (
            <div className="flex items-center gap-2 text-rk-muted"><Loader2 size={16} className="animate-spin" /> Loading…</div>
          ) : inquiries.length === 0 ? (
            <Card><CardContent className="p-10 text-center">
              <div className="text-rk-muted">You haven't created any inquiries yet.</div>
              <Button asChild className="mt-4 bg-rk-orange hover:bg-rk-orange-600 text-white rounded-full">
                <Link to="/">Start with your first trip</Link>
              </Button>
            </CardContent></Card>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {inquiries.map((inq) => <InquiryCard key={inq.id} inq={inq} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="profile" className="mt-6 max-w-xl space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-widest font-bold text-rk-muted">Name</Label>
            <Input className="h-12 mt-1" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} data-testid="profile-name" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest font-bold text-rk-muted">Phone</Label>
            <Input className="h-12 mt-1" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} data-testid="profile-phone" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest font-bold text-rk-muted">Email</Label>
            <Input className="h-12 mt-1" value={user.email} disabled />
          </div>
          <Button onClick={saveProfile} disabled={saving}
            className="bg-rk-navy hover:bg-rk-navy-700 text-white rounded-full px-6" data-testid="profile-save">
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </TabsContent>

        <TabsContent value="settings" className="mt-6 max-w-md space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-widest font-bold text-rk-muted">Preferred language</Label>
            <Select value={lang} onValueChange={setLang}>
              <SelectTrigger className="h-12 mt-1" data-testid="settings-language"><SelectValue /></SelectTrigger>
              <SelectContent>
                {languages.map((l) => <SelectItem key={l.code} value={l.code}>{l.native} ({l.name})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InquiryCard({ inq }) {
  const colors = { hot: "#FF7A00", warm: "#F59E0B", cold: "#3B82F6" };
  const c = colors[inq.lead_score] || "#F59E0B";
  const waUrl = buildInquiryWhatsApp({ inquiry: inq, number: "919999999999" });
  return (
    <div className="rounded-2xl bg-white border border-rk-border p-5" data-testid={`inquiry-card-${inq.id}`}>
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold uppercase tracking-widest text-rk-orange">
          {inq.service_type} {inq.vehicle_category && `· ${inq.vehicle_category}`}
        </div>
        <Badge style={{ background: c, color: "white" }} className="uppercase font-bold tracking-widest text-[10px]">
          {inq.lead_score}
        </Badge>
      </div>
      <div className="mt-3 font-heading font-bold text-rk-navy flex items-center gap-2">
        <MapPin size={14} className="text-rk-orange" />
        {inq.pickup} {inq.destination && `→ ${inq.destination}`}
      </div>
      <div className="text-xs text-rk-muted flex items-center gap-3 mt-1">
        {inq.journey_date && <span className="flex items-center gap-1"><Calendar size={12} /> {inq.journey_date}</span>}
        {inq.passengers && <span>{inq.passengers} pax</span>}
        <span>· Status: <b className="text-rk-ink uppercase">{inq.status}</b></span>
      </div>
      {inq.quote_min && (
        <div className="mt-3 font-heading text-lg font-extrabold text-rk-navy">
          ₹{inq.quote_min.toLocaleString()} – ₹{inq.quote_max.toLocaleString()}
          <span className="text-xs text-rk-muted font-normal ml-2">≈ {inq.distance_km} km</span>
        </div>
      )}
      <a href={waUrl} target="_blank" rel="noreferrer"
         className="mt-4 inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1FB855] text-white rounded-full px-4 py-2 text-sm font-semibold"
         data-testid={`inquiry-wa-${inq.id}`}>
        <MessageCircle size={14} /> Resend on WhatsApp
      </a>
    </div>
  );
}
