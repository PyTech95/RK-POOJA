import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth-context";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Logo } from "../components/Logo";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(email, password);
      toast.success(`Welcome back, ${u.name}!`);
      navigate(u.role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2" data-testid="login-page">
      <div className="rk-hero-bg text-white relative hidden lg:flex flex-col p-12 justify-between">
        <div className="bg-white inline-flex p-3 rounded-xl w-fit"><Logo size={38} /></div>
        <div>
          <h2 className="font-heading font-extrabold text-4xl tracking-tight">Welcome back to RK POOJA</h2>
          <p className="mt-3 text-white/70 max-w-md">
            Continue your journey. All your inquiries, saved locations, and trip history — in one place.
          </p>
        </div>
        <div className="text-xs uppercase tracking-widest text-white/40">
          One app. All rides.
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <form onSubmit={submit} className="w-full max-w-md space-y-5">
          <div className="lg:hidden"><Logo size={36} /></div>
          <div>
            <h1 className="font-heading font-extrabold text-3xl text-rk-navy">Login</h1>
            <p className="text-sm text-rk-muted mt-1">Don't have an account?{" "}
              <Link to="/signup" className="text-rk-orange font-semibold" data-testid="signup-link">Sign up</Link>
            </p>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-widest font-bold text-rk-muted">Email</Label>
            <Input type="email" required className="h-12 mt-1" value={email} onChange={(e) => setEmail(e.target.value)}
              data-testid="login-email" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest font-bold text-rk-muted">Password</Label>
            <Input type="password" required className="h-12 mt-1" value={password} onChange={(e) => setPassword(e.target.value)}
              data-testid="login-password" />
          </div>

          <Button type="submit" disabled={loading}
            className="w-full h-12 bg-rk-orange hover:bg-rk-orange-600 text-white font-bold rounded-full"
            data-testid="login-submit">
            {loading ? <><Loader2 size={16} className="animate-spin mr-2" /> Logging in…</> : "Login"}
          </Button>

          <div className="text-xs text-rk-muted text-center border border-dashed border-rk-border rounded-lg p-3">
            <b>Admin demo:</b> admin@rkpooja.in · admin@123
          </div>
        </form>
      </div>
    </div>
  );
}
