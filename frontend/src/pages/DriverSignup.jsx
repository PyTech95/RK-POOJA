import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Logo } from "../components/Logo";
import { Car, Bike, Bus, Truck, Package, Crown, ShipWheel, Gift, Loader2, ShieldCheck, IndianRupee } from "lucide-react";
import { toast } from "sonner";

const VEHICLE_TYPES = [
  { v: "car", label: "Car", Icon: Car },
  { v: "auto", label: "Auto", Icon: ShipWheel },
  { v: "bike", label: "Bike", Icon: Bike },
  { v: "tempo", label: "Tempo", Icon: Crown },
  { v: "bus", label: "Bus", Icon: Bus },
  { v: "truck", label: "Truck/Goods", Icon: Truck },
];

const CATEGORIES = {
  car: ["Mini Car", "Sedan", "SUV", "Premium SUV", "Luxury Car", "Luxury SUV", "Electric Vehicle"],
  tempo: ["9 Seater", "12 Seater", "17 Seater", "20 Seater", "26 Seater"],
  bus: ["Mini Bus", "Traveller Bus", "AC Bus", "Sleeper Bus", "Luxury Coach", "Volvo", "School Bus", "Corporate Bus"],
  truck: ["Mini Truck", "Tata Ace", "Pickup Truck", "Truck", "Container"],
  auto: [], bike: [],
};

export default function DriverSignup() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { refresh } = useAuth();
  const [form, setForm] = useState({
    name: "", email: "", phone: "", password: "",
    vehicle_type: "car", vehicle_category: "Sedan", vehicle_number: "",
    base_city: "", referral_code: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ref = params.get("ref");
    if (ref) setForm((f) => ({ ...f, referral_code: ref.toUpperCase() }));
  }, [params]);

  const onVehicleChange = (v) => {
    const cats = CATEGORIES[v] || [];
    setForm((f) => ({ ...f, vehicle_type: v, vehicle_category: cats[0] || "" }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/driver/signup", form);
      localStorage.setItem("rk_token", data.token);
      await refresh();
      toast.success("Welcome to RK POOJA Partner!");
      navigate("/driver");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  const cats = CATEGORIES[form.vehicle_type] || [];

  return (
    <div className="min-h-screen grid lg:grid-cols-2" data-testid="driver-signup-page">
      <div className="rk-hero-bg text-white relative hidden lg:flex flex-col p-10 justify-between overflow-hidden">
        <div className="absolute inset-0 rk-grain opacity-[0.07]" />
        <div className="relative">
          <div className="bg-white inline-flex p-4 rounded-2xl w-fit"><img src="/logo.png" alt="RK POOJA" className="h-20 w-auto" /></div>
        </div>
        <div className="relative">
          <div className="inline-flex items-center gap-2 bg-rk-orange/20 border border-rk-orange/40 px-3 py-1.5 rounded-full mb-4">
            <Car size={14} className="text-rk-orange" />
            <span className="text-[11px] font-bold uppercase tracking-widest">Partner / Driver</span>
          </div>
          <h2 className="font-heading font-extrabold text-4xl tracking-tight">Drive with RK POOJA</h2>
          <p className="mt-3 text-white/80 max-w-md">
            Get verified leads, accept the rides you want, keep your earnings — straight to your wallet.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 max-w-md">
            <Perk Icon={Gift} title="₹500 signup bonus" desc="Credited instantly to wallet" />
            <Perk Icon={IndianRupee} title="0% commission first month" desc="100% of earnings yours" />
            <Perk Icon={ShieldCheck} title="Verified passengers" desc="WhatsApp-linked customers" />
            <Perk Icon={Gift} title="₹500 per driver referral" desc="Invite friends, get paid" />
          </div>
        </div>
        <div className="relative text-xs uppercase tracking-widest text-white/40">
          One App. All Rides.
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <form onSubmit={submit} className="w-full max-w-md space-y-4">
          <div className="lg:hidden"><Logo size={36} /></div>

          <div className="rounded-2xl bg-rk-orange/10 border border-rk-orange/30 p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-rk-orange text-white grid place-items-center shrink-0">
              <Car size={18} />
            </div>
            <div>
              <div className="font-heading font-bold text-rk-navy">3 आसान कदम / 3 easy steps</div>
              <ol className="text-xs text-rk-muted mt-1 space-y-0.5">
                <li>1. नाम और फ़ोन भरें · Fill name & phone</li>
                <li>2. गाड़ी की जानकारी चुनें · Pick vehicle type</li>
                <li>3. ₹500 बोनस पाएँ · Get ₹500 bonus instantly</li>
              </ol>
            </div>
          </div>

          <div>
            <h1 className="font-heading font-extrabold text-3xl text-rk-navy">Become a partner</h1>
            <p className="text-sm text-rk-muted mt-1">
              Already a partner?{" "}
              <Link to="/login" className="text-rk-orange font-semibold" data-testid="driver-login-link">Login</Link>
            </p>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-widest font-bold text-rk-muted">Full name</Label>
            <Input required className="h-12 mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="driver-name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-widest font-bold text-rk-muted">Email</Label>
              <Input type="email" required className="h-12 mt-1" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="driver-email" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest font-bold text-rk-muted">Phone</Label>
              <Input required className="h-12 mt-1" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 99999 99999" data-testid="driver-phone" />
            </div>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest font-bold text-rk-muted">Password</Label>
            <Input type="password" required minLength={6} className="h-12 mt-1" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} data-testid="driver-password" />
          </div>

          <div className="pt-3 border-t border-rk-border">
            <Label className="text-xs uppercase tracking-widest font-bold text-rk-muted mb-2 block">Vehicle type</Label>
            <div className="grid grid-cols-3 gap-2">
              {VEHICLE_TYPES.map((v) => (
                <button
                  type="button"
                  key={v.v}
                  onClick={() => onVehicleChange(v.v)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition ${
                    form.vehicle_type === v.v
                      ? "border-rk-orange bg-rk-orange/5 text-rk-navy"
                      : "border-rk-border hover:border-rk-navy text-rk-muted"
                  }`}
                  data-testid={`driver-vehicle-${v.v}`}
                >
                  <v.Icon size={20} />
                  <span className="text-xs font-semibold">{v.label}</span>
                </button>
              ))}
            </div>
          </div>

          {cats.length > 0 && (
            <div>
              <Label className="text-xs uppercase tracking-widest font-bold text-rk-muted">Category</Label>
              <Select value={form.vehicle_category} onValueChange={(v) => setForm({ ...form, vehicle_category: v })}>
                <SelectTrigger className="h-12 mt-1" data-testid="driver-category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {cats.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-widest font-bold text-rk-muted">Vehicle number</Label>
              <Input className="h-12 mt-1 uppercase" value={form.vehicle_number}
                onChange={(e) => setForm({ ...form, vehicle_number: e.target.value.toUpperCase() })}
                placeholder="BR01 AB 1234" data-testid="driver-vehicle-number" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest font-bold text-rk-muted">Base city</Label>
              <Input className="h-12 mt-1" value={form.base_city}
                onChange={(e) => setForm({ ...form, base_city: e.target.value })}
                placeholder="e.g. Patna" data-testid="driver-city" />
            </div>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-widest font-bold text-rk-muted flex items-center gap-1">
              <Gift size={12} className="text-rk-orange" /> Referral code (optional)
            </Label>
            <Input className="h-12 mt-1 uppercase" value={form.referral_code} maxLength={12}
              onChange={(e) => setForm({ ...form, referral_code: e.target.value.toUpperCase() })}
              placeholder="Got a code?" data-testid="driver-referral" />
          </div>

          <Button type="submit" disabled={loading}
            className="w-full h-12 bg-rk-orange hover:bg-rk-orange-600 text-white font-bold rounded-full"
            data-testid="driver-submit">
            {loading ? <><Loader2 size={16} className="animate-spin mr-2" /> Creating partner account…</> : "Become a partner & claim ₹500"}
          </Button>
          <p className="text-xs text-rk-muted text-center">
            By signing up you agree to the partner terms. KYC docs collected on next screen.
          </p>
        </form>
      </div>
    </div>
  );
}

function Perk({ Icon, title, desc }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
      <div className="flex items-center gap-2"><Icon size={14} className="text-rk-orange" /> <span className="text-sm font-semibold">{title}</span></div>
      <p className="text-xs text-white/60 mt-1">{desc}</p>
    </div>
  );
}
