import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Button } from "./ui/button";
import { Copy, MessageCircle, Share2, Gift, Trophy, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function ReferralPanel() {
  const [data, setData] = useState(null);
  const [whatsappNumber, setWhatsappNumber] = useState("919999999999");

  useEffect(() => {
    api.get("/referrals/me").then((r) => setData(r.data)).catch(() => {});
    api.get("/whatsapp/number").then((r) => setWhatsappNumber(r.data.number)).catch(() => {});
  }, []);

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const share = async (text) => {
    if (navigator.share) {
      try { await navigator.share({ title: "RK POOJA", text, url: window.location.origin }); } catch {}
    } else {
      copy(text);
    }
  };

  if (!data) return <div className="text-rk-muted flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading…</div>;

  const signupUrl = `${window.location.origin}/signup?ref=${data.code}`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(data.share_text)}`;

  return (
    <div className="space-y-5 max-w-2xl" data-testid="referral-panel">
      <div className="rounded-2xl bg-gradient-to-br from-rk-orange to-rk-orange-600 text-white p-6 relative overflow-hidden">
        <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2">
            <Gift size={18} /> <span className="text-xs uppercase font-bold tracking-widest">Refer & earn</span>
          </div>
          <h3 className="font-heading font-black text-3xl mt-2">Invite friends. Get ₹100 each.</h3>
          <p className="text-white/90 mt-2 text-sm max-w-md">
            Share your code. When a friend signs up, you both get ₹100 wallet credit instantly.
          </p>
          <div className="mt-5 grid sm:grid-cols-3 gap-3">
            <Stat icon={<Trophy size={14} />} label="Invited" value={data.referred_count} />
            <Stat icon={<Gift size={14} />} label="Earned" value={`₹${data.total_earned.toLocaleString()}`} />
            <Stat icon={<Share2 size={14} />} label="Your code" value={data.code} mono />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-rk-border bg-white p-5 space-y-4">
        <div>
          <div className="text-xs uppercase font-bold tracking-widest text-rk-muted">Your referral code</div>
          <div className="mt-2 flex items-stretch gap-2">
            <div className="flex-1 bg-slate-50 border border-rk-border rounded-xl px-4 py-3 font-mono font-bold text-xl text-rk-navy tracking-widest" data-testid="referral-code">
              {data.code}
            </div>
            <Button onClick={() => copy(data.code)} variant="outline" className="rounded-xl" data-testid="referral-copy-code">
              <Copy size={16} />
            </Button>
          </div>
        </div>

        <div>
          <div className="text-xs uppercase font-bold tracking-widest text-rk-muted">Personal sign-up link</div>
          <div className="mt-2 flex items-stretch gap-2">
            <div className="flex-1 bg-slate-50 border border-rk-border rounded-xl px-4 py-3 font-mono text-sm text-rk-ink truncate" data-testid="referral-link">
              {signupUrl}
            </div>
            <Button onClick={() => copy(signupUrl)} variant="outline" className="rounded-xl" data-testid="referral-copy-link">
              <Copy size={16} />
            </Button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-2 pt-2">
          <a
            href={waUrl} target="_blank" rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1FB855] text-white font-semibold rounded-full px-5 h-12"
            data-testid="referral-share-whatsapp"
          >
            <MessageCircle size={16} /> Share on WhatsApp
          </a>
          <Button onClick={() => share(data.share_text)} variant="outline" className="rounded-full h-12" data-testid="referral-share-native">
            <Share2 size={16} className="mr-2" /> Share anywhere
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-rk-border bg-white p-5">
        <div className="text-xs uppercase font-bold tracking-widest text-rk-muted mb-2">How it works</div>
        <ul className="text-sm space-y-2 text-rk-ink">
          <li>1. Share your code or sign-up link with friends and family.</li>
          <li>2. They sign up at RK POOJA using your code.</li>
          <li>3. You both get <b>₹100</b> instantly in your wallet.</li>
          <li>4. They use it on their first ride — you keep earning forever.</li>
        </ul>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, mono }) {
  return (
    <div className="bg-white/10 border border-white/20 rounded-xl p-3">
      <div className="flex items-center gap-1 text-xs uppercase tracking-widest text-white/80">{icon}{label}</div>
      <div className={`mt-1 font-heading font-extrabold text-2xl ${mono ? "font-mono tracking-widest" : ""}`}>{value}</div>
    </div>
  );
}
