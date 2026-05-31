import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Mic, MessageCircle, ArrowRight, ShieldCheck, Clock, Headphones,
  Star, MapPin, Sparkles, ChevronRight,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { SERVICES, POPULAR_ROUTES } from "../lib/services";
import { useLang } from "../lib/language-context";
import { useState } from "react";
import { VoiceBooking } from "../components/VoiceBooking";
import { AIChat } from "../components/AIChat";

const REVIEWS = [
  { name: "Rohan S.", city: "Patna", text: "Booked a 17-seater for my parents' Char Dham trip on WhatsApp in 5 minutes. Driver was excellent.", stars: 5 },
  { name: "Anita M.", city: "Mumbai", text: "Same-day documents delivery to Pune — RK POOJA's porter team was super fast.", stars: 5 },
  { name: "Karthik V.", city: "Bangalore", text: "Wedding bus for 80 people coordinated end-to-end. Stress-free!", stars: 5 },
  { name: "Neha P.", city: "Delhi", text: "Late-night airport sedan, AC, clean car, fair price. Love the Hindi chat.", stars: 5 },
];

export default function Home() {
  const { t } = useLang();
  const [openVoice, setOpenVoice] = useState(false);
  const [openChat, setOpenChat] = useState(false);

  return (
    <div className="min-h-screen" data-testid="home-page">
      {/* HERO */}
      <section className="rk-hero-bg text-white relative overflow-hidden">
        <div className="absolute inset-0 rk-grain opacity-[0.06] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-28 relative">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7">
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-3 py-1.5 backdrop-blur"
              >
                <Sparkles size={14} className="text-rk-orange" />
                <span className="text-[11px] font-bold uppercase tracking-widest">AI-powered · 12 Indian languages</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.05 }}
                className="font-heading font-black text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight mt-5 text-rk-balance"
                data-testid="hero-title"
              >
                {t("hero_title")}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}
                className="mt-5 text-base sm:text-lg text-white/80 max-w-2xl leading-relaxed"
              >
                {t("hero_sub")}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.25 }}
                className="mt-7 flex flex-wrap items-center gap-3"
              >
                <Button
                  onClick={() => setOpenVoice(true)}
                  className="bg-rk-orange hover:bg-rk-orange-600 text-white rounded-full h-14 px-7 text-base font-bold shadow-2xl shadow-rk-orange/40"
                  data-testid="hero-voice-cta"
                >
                  <Mic className="mr-2" size={18} /> {t("cta_voice")}
                </Button>
                <Button
                  onClick={() => setOpenChat(true)}
                  variant="ghost"
                  className="text-white border border-white/30 rounded-full h-14 px-6 hover:bg-white/10"
                  data-testid="hero-chat-cta"
                >
                  <MessageCircle className="mr-2" size={16} /> Chat with AI
                </Button>
              </motion.div>

              <div className="mt-10 grid grid-cols-3 gap-4 max-w-lg">
                <TrustItem icon={<ShieldCheck size={16} />} label={t("safe_reliable")} />
                <TrustItem icon={<Clock size={16} />} label={t("on_time")} />
                <TrustItem icon={<Headphones size={16} />} label={t("support")} />
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.2 }}
              className="lg:col-span-5"
            >
              <div className="relative">
                <div className="bg-white rounded-2xl p-5 shadow-2xl border border-white/10">
                  <div className="text-xs uppercase tracking-widest font-bold text-rk-orange">Live AI demo</div>
                  <div className="font-heading font-bold text-rk-ink text-xl mt-1">"Sedan, Patna → Gaya, tomorrow"</div>
                  <div className="mt-4 border-t border-rk-border pt-4 space-y-2 text-sm">
                    <Row label="Service" value="Car · Sedan" />
                    <Row label="Distance" value="~110 km" />
                    <Row label="Est. quote" value="₹2,500 – ₹3,200" highlight />
                    <Row label="AI priority" value="HOT 🔥" highlight />
                  </div>
                  <Button asChild className="w-full mt-5 bg-rk-navy hover:bg-rk-navy-700 text-white">
                    <Link to="/services/car" data-testid="hero-card-cta">Try with your trip <ArrowRight size={16} className="ml-2" /></Link>
                  </Button>
                </div>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-rk-orange/20 rounded-2xl -z-10 blur-2xl" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SERVICES GRID */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20" data-testid="services-section">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <div className="text-xs uppercase font-bold tracking-widest text-rk-orange">{t("services_label")}</div>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl text-rk-navy mt-2 tracking-tight">
              {t("services_title")}
            </h2>
          </div>
          <Link to="/services/car" className="text-sm font-semibold text-rk-navy hover:text-rk-orange flex items-center gap-1">
            Browse all <ChevronRight size={14} />
          </Link>
        </div>

        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {SERVICES.map((s, i) => (
            <motion.div
              key={s.key}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
            >
              <Link
                to={`/services/${s.key}`}
                className="rk-service-tile block rounded-2xl bg-white border border-rk-border p-5 h-full"
                data-testid={`service-card-${s.key}`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-rk-navy text-white grid place-items-center">
                    <s.Icon size={22} />
                  </div>
                  <ArrowRight className="text-rk-orange" size={18} />
                </div>
                <h3 className="font-heading font-bold text-lg mt-4 text-rk-ink">{s.name}</h3>
                <div className="text-xs text-rk-orange font-semibold uppercase tracking-widest mt-1">{s.short}</div>
                <p className="text-sm text-rk-muted mt-2 leading-relaxed">{s.desc}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-white border-y border-rk-border" data-testid="how-it-works">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="text-xs uppercase font-bold tracking-widest text-rk-orange">{t("how_it_works")}</div>
          <h2 className="font-heading font-extrabold text-3xl sm:text-4xl text-rk-navy mt-2 tracking-tight">
            Three taps to your ride
          </h2>
          <div className="mt-10 grid md:grid-cols-3 gap-6">
            {[
              { t: t("step1_t"), d: t("step1_d") },
              { t: t("step2_t"), d: t("step2_d") },
              { t: t("step3_t"), d: t("step3_d") },
            ].map((s, i) => (
              <div key={i} className="rounded-2xl border border-rk-border p-6 bg-slate-50" data-testid={`step-${i+1}`}>
                <div className="font-heading text-5xl font-black text-rk-orange/30">0{i+1}</div>
                <div className="font-heading font-bold text-xl text-rk-navy mt-2">{s.t}</div>
                <p className="text-sm text-rk-muted mt-2 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* POPULAR ROUTES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="text-xs uppercase font-bold tracking-widest text-rk-orange">{t("popular_routes")}</div>
        <h2 className="font-heading font-extrabold text-3xl sm:text-4xl text-rk-navy mt-2 tracking-tight">
          Trusted across India
        </h2>
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {POPULAR_ROUTES.map((r, i) => (
            <Link
              key={i}
              to="/services/car"
              className="rounded-xl border border-rk-border bg-white p-4 flex items-center justify-between hover:border-rk-orange transition"
              data-testid={`route-${i}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-rk-orange/10 text-rk-orange grid place-items-center">
                  <MapPin size={18} />
                </div>
                <div>
                  <div className="font-heading font-bold text-rk-ink">{r.from} → {r.to}</div>
                  <div className="text-xs text-rk-muted">{r.price}</div>
                </div>
              </div>
              <ArrowRight size={16} className="text-rk-muted" />
            </Link>
          ))}
        </div>
      </section>

      {/* WHY US */}
      <section className="bg-rk-navy text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="text-xs uppercase font-bold tracking-widest text-rk-orange">{t("why_us")}</div>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl mt-2 tracking-tight">
              Built for India, powered by AI
            </h2>
            <p className="text-white/70 mt-4 leading-relaxed">
              Talk to RK POOJA in your language. Our AI understands your trip, estimates fares,
              and instantly hands you off to a real human on WhatsApp — no app downloads, no friction.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3 max-w-md">
              {[
                "12 Indian languages",
                "Voice-first booking",
                "AI quote estimator",
                "WhatsApp handoff",
                "Verified vehicles",
                "24×7 support",
              ].map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-rk-orange" /> {f}
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3" data-testid="reviews-grid">
            {REVIEWS.map((r, i) => (
              <div key={i} className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-4">
                <div className="flex text-rk-orange">
                  {Array.from({ length: r.stars }).map((_, j) => <Star key={j} size={14} fill="currentColor" />)}
                </div>
                <p className="mt-2 text-sm text-white/80 leading-relaxed">"{r.text}"</p>
                <div className="mt-3 text-xs font-bold tracking-widest uppercase text-white/60">
                  {r.name} · {r.city}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHATSAPP CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="rounded-3xl bg-gradient-to-br from-rk-orange to-rk-orange-600 text-white p-8 sm:p-12 relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <div className="text-xs uppercase font-bold tracking-widest text-white/80">Ready when you are</div>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl mt-2 max-w-2xl tracking-tight">
              Send your trip to WhatsApp in one tap.
            </h2>
            <p className="mt-3 max-w-xl text-white/90">
              Our team confirms the best vehicle and final price in minutes. {t("download_cta")}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={`https://wa.me/919999999999?text=${encodeURIComponent("Hello RK POOJA, I want to book a ride.")}`}
                target="_blank" rel="noreferrer"
                className="bg-white text-rk-navy rounded-full px-6 py-3 font-bold inline-flex items-center gap-2"
                data-testid="cta-whatsapp"
              >
                <MessageCircle size={16} /> Open WhatsApp
              </a>
              <Button asChild variant="ghost" className="text-white border border-white/40 rounded-full px-6 hover:bg-white/10">
                <Link to="/services/car" data-testid="cta-explore">{t("cta_explore")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <VoiceBooking open={openVoice} onOpenChange={setOpenVoice} />
      <AIChat open={openChat} onOpenChange={setOpenChat} />
    </div>
  );
}

function TrustItem({ icon, label }) {
  return (
    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
      <span className="text-rk-orange">{icon}</span>
      <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
    </div>
  );
}

function Row({ label, value, highlight }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-rk-muted">{label}</span>
      <span className={highlight ? "font-heading font-bold text-rk-navy" : "text-rk-ink font-medium"}>{value}</span>
    </div>
  );
}
