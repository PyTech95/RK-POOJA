import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = params.get("session_id");
  const [state, setState] = useState({ status: "checking", amount: 0 });

  useEffect(() => {
    if (!sessionId) { setState({ status: "failed", amount: 0 }); return; }
    let attempts = 0;
    let stopped = false;
    const poll = async () => {
      attempts++;
      try {
        const { data } = await api.get(`/wallet/checkout/status/${sessionId}`);
        if (data.payment_status === "paid") {
          setState({ status: "paid", amount: data.amount });
          return;
        }
        if (data.status === "expired") {
          setState({ status: "failed", amount: data.amount });
          return;
        }
        if (attempts < 8 && !stopped) setTimeout(poll, 2000);
        else setState({ status: "pending", amount: data.amount || 0 });
      } catch {
        if (attempts < 5 && !stopped) setTimeout(poll, 2000);
        else setState({ status: "failed", amount: 0 });
      }
    };
    poll();
    return () => { stopped = true; };
  }, [sessionId]);

  const goWallet = () => navigate("/dashboard?tab=wallet");

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-rk-bg" data-testid="payment-success-page">
      <div className="bg-white rounded-2xl border border-rk-border p-10 max-w-md w-full text-center shadow-lg">
        {state.status === "checking" || state.status === "pending" ? (
          <>
            <Loader2 size={48} className="text-rk-orange animate-spin mx-auto" />
            <h2 className="font-heading font-extrabold text-2xl mt-4 text-rk-navy">Confirming payment…</h2>
            <p className="text-rk-muted mt-2 text-sm">Stripe is processing your transaction.</p>
          </>
        ) : state.status === "paid" ? (
          <>
            <div className="w-16 h-16 rounded-full bg-green-100 grid place-items-center mx-auto"><CheckCircle2 size={36} className="text-green-600" /></div>
            <h2 className="font-heading font-extrabold text-2xl mt-4 text-rk-navy">Payment successful!</h2>
            <p className="font-heading text-3xl font-black text-rk-orange mt-2">+ ₹{state.amount}</p>
            <p className="text-rk-muted mt-2 text-sm">Added to your RK Wallet.</p>
            <button onClick={goWallet} className="mt-6 w-full bg-rk-orange hover:bg-rk-orange-600 text-white rounded-full py-3 font-bold" data-testid="payment-success-wallet">
              Go to wallet
            </button>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-red-100 grid place-items-center mx-auto"><XCircle size={36} className="text-red-600" /></div>
            <h2 className="font-heading font-extrabold text-2xl mt-4 text-rk-navy">Payment failed</h2>
            <p className="text-rk-muted mt-2 text-sm">Please try again or contact support.</p>
            <button onClick={goWallet} className="mt-6 w-full bg-rk-navy hover:bg-rk-navy-700 text-white rounded-full py-3 font-bold">
              Back to wallet
            </button>
          </>
        )}
      </div>
    </div>
  );
}
