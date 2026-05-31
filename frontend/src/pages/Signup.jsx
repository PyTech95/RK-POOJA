import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth-context";
import { useLang } from "../lib/language-context";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Logo } from "../components/Logo";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Signup() {
  const { register } = useAuth();
  const { lang } = useLang();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register({ ...form, language: lang });
      toast.success("Account created!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2" data-testid="signup-page">
      <div className="rk-hero-bg text-white relative hidden lg:flex flex-col p-12 justify-between">
        <div className="bg-white inline-flex p-4 rounded-2xl w-fit"><img src="/logo.png" alt="RK POOJA" className="h-24 w-auto" /></div>
        <div>
          <h2 className="font-heading font-extrabold text-4xl tracking-tight">Join RK POOJA</h2>
          <p className="mt-3 text-white/70 max-w-md">
            One account for every ride — cars, buses, tempos, autos, bikes, parcels and goods.
          </p>
        </div>
        <div className="text-xs uppercase tracking-widest text-white/40">One app. All rides.</div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <form onSubmit={submit} className="w-full max-w-md space-y-4">
          <div className="lg:hidden"><Logo size={36} /></div>
          <div>
            <h1 className="font-heading font-extrabold text-3xl text-rk-navy">Create account</h1>
            <p className="text-sm text-rk-muted mt-1">Already have one?{" "}
              <Link to="/login" className="text-rk-orange font-semibold" data-testid="login-link">Login</Link>
            </p>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-widest font-bold text-rk-muted">Full name</Label>
            <Input required className="h-12 mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              data-testid="signup-name" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest font-bold text-rk-muted">Email</Label>
            <Input type="email" required className="h-12 mt-1" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              data-testid="signup-email" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest font-bold text-rk-muted">Phone (WhatsApp)</Label>
            <Input className="h-12 mt-1" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+91 99999 99999" data-testid="signup-phone" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest font-bold text-rk-muted">Password</Label>
            <Input type="password" required minLength={6} className="h-12 mt-1" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} data-testid="signup-password" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest font-bold text-rk-muted flex items-center gap-1">
              <Gift size={12} className="text-rk-orange" /> Referral code (optional)
            </Label>
            <Input className="h-12 mt-1 uppercase" value={form.referral_code} maxLength={12}
              onChange={(e) => setForm({ ...form, referral_code: e.target.value.toUpperCase() })}
              placeholder="Got a code from a friend?" data-testid="signup-referral" />
            <p className="text-xs text-rk-muted mt-1">
              You and your friend both get <b className="text-rk-orange">₹100</b> wallet credit.
            </p>
          </div>

          <Button type="submit" disabled={loading}
            className="w-full h-12 bg-rk-orange hover:bg-rk-orange-600 text-white font-bold rounded-full"
            data-testid="signup-submit">
            {loading ? <><Loader2 size={16} className="animate-spin mr-2" /> Creating…</> : "Create account"}
          </Button>
        </form>
      </div>
    </div>
  );
}
