import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Wallet as WalletIcon, ArrowDownCircle, ArrowUpCircle, Gift, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

const QUICK = [100, 500, 1000, 2000];

export function WalletPanel() {
  const [data, setData] = useState(null);
  const [amount, setAmount] = useState("");
  const [topping, setTopping] = useState(false);

  const load = async () => {
    try {
      const r = await api.get("/wallet/me");
      setData(r.data);
    } catch (e) {
      toast.error("Could not load wallet");
    }
  };

  useEffect(() => { load(); }, []);

  const topup = async (a) => {
    const amt = Number(a || amount);
    if (!amt || amt <= 0) { toast.error("Enter a positive amount"); return; }
    setTopping(true);
    try {
      await api.post("/wallet/topup", { amount: amt });
      toast.success(`₹${amt} added to wallet`);
      setAmount("");
      load();
    } catch (e) {
      toast.error("Top-up failed");
    } finally {
      setTopping(false);
    }
  };

  if (!data) return <div className="text-rk-muted flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading…</div>;

  return (
    <div className="space-y-5" data-testid="wallet-panel">
      <div className="rounded-2xl text-white relative overflow-hidden p-6 bg-gradient-to-br from-rk-navy to-rk-navy-700">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-rk-orange/30 blur-3xl" />
        <div className="relative flex items-start justify-between">
          <div>
            <div className="text-xs uppercase font-bold tracking-widest text-white/70">RK Wallet</div>
            <div className="font-heading font-black text-5xl mt-2" data-testid="wallet-balance">
              ₹{(data.balance || 0).toLocaleString()}
            </div>
            <div className="text-xs text-white/60 mt-1">Available balance · INR</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rk-orange grid place-items-center">
            <WalletIcon size={22} />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-rk-border bg-white p-5">
        <div className="text-xs uppercase font-bold tracking-widest text-rk-muted mb-3 flex items-center gap-2">
          <Plus size={12} /> Quick top-up
        </div>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {QUICK.map((a) => (
            <Button key={a} variant="outline" disabled={topping} onClick={() => topup(a)}
              className="h-11 rounded-full border-rk-border hover:border-rk-orange hover:text-rk-orange"
              data-testid={`topup-${a}`}>
              + ₹{a}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input type="number" placeholder="Custom amount" min={1} value={amount}
            onChange={(e) => setAmount(e.target.value)} className="h-11" data-testid="topup-custom" />
          <Button onClick={() => topup()} disabled={topping}
            className="h-11 bg-rk-orange hover:bg-rk-orange-600 text-white rounded-full px-5" data-testid="topup-submit">
            {topping ? <Loader2 size={14} className="animate-spin" /> : "Top up"}
          </Button>
        </div>
        <p className="text-[11px] text-rk-muted mt-2">
          Instant credit (mock gateway). Stripe/Razorpay can be enabled later — keys not collected yet.
        </p>
      </div>

      <div className="rounded-2xl border border-rk-border bg-white p-5">
        <div className="text-xs uppercase font-bold tracking-widest text-rk-muted mb-3">Recent transactions</div>
        {data.transactions.length === 0 ? (
          <div className="text-sm text-rk-muted">No transactions yet.</div>
        ) : (
          <div className="space-y-2" data-testid="wallet-transactions">
            {data.transactions.map((t) => <TxnRow key={t.id} t={t} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function TxnRow({ t }) {
  const isIn = t.direction === "in";
  const Icon = t.type === "referral_bonus" ? Gift : (isIn ? ArrowDownCircle : ArrowUpCircle);
  return (
    <div className="flex items-center justify-between py-2 border-b border-rk-border last:border-b-0">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg grid place-items-center ${isIn ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
          <Icon size={16} />
        </div>
        <div>
          <div className="font-medium text-rk-ink text-sm capitalize">{t.type.replace("_", " ")}</div>
          <div className="text-xs text-rk-muted">{t.note || "—"}</div>
        </div>
      </div>
      <div className={`font-heading font-bold ${isIn ? "text-green-600" : "text-red-600"}`}>
        {isIn ? "+" : "−"}₹{Number(t.amount).toLocaleString()}
      </div>
    </div>
  );
}
