import { CheckCircle2, Circle, Clock, Smartphone, Headphones, Car, MapPin, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";

const SECTIONS = [
  {
    title: "Customer (rider) app",
    subtitle: "What this PWA already does for end users",
    color: "#0A2E6D",
    icon: Smartphone,
    done: [
      "AI voice booking — speak naturally, AI extracts the trip & creates ride request",
      "AI chat assistant — multilingual, powered by Claude Sonnet 4.5",
      "12 Indian languages (English, Hindi, Marathi, Gujarati, Bengali, Tamil, Telugu, Kannada, Malayalam, Punjabi, Odia, Assamese)",
      "Real road distance — OpenStreetMap + OSRM routing (no API key)",
      "OSM Nominatim address autocomplete with 'Use my location' button",
      "AI quote estimator (per-km rate tables for 7 service types)",
      "AI lead scoring (Hot / Warm / Cold)",
      "7 service inquiry flows — Car, Auto, Bike, Tempo, Bus, Porter, Goods",
      "WhatsApp-first conversion (wa.me deep links with full structured inquiry)",
      "Auth — JWT email/password, signup with referral code",
      "Wallet — instant top-up (mock), transactions, balance",
      "Refer & earn — ₹100 each, unique code, share via WhatsApp",
      "User dashboard — inquiries, wallet, referrals, profile, language",
      "PWA — installable, offline-ready service worker, manifest + icons",
      "Floating action buttons — WhatsApp, Voice, Chat, Call",
    ],
    todo: [
      "Real payment gateway (Stripe/Razorpay) for wallet top-up",
      "OTP login (Twilio SMS)",
      "Email/SMS notifications for inquiry status",
      "Push notifications (PWA + FCM)",
      "Saved locations (home, office, favourites)",
      "Travel history exports (PDF/CSV)",
      "Complete UI translations for all 12 languages (currently EN + HI complete)",
      "Coupon system + first-ride discount",
    ],
  },
  {
    title: "Driver / Partner app",
    subtitle: "Separate app — NOT built yet. This is the next major phase.",
    color: "#FF7A00",
    icon: Car,
    done: [],
    todo: [
      "Driver signup + KYC (Aadhaar, DL, RC, PAN upload)",
      "Document verification status & re-upload",
      "Vehicle profile (type, plate, insurance, fitness)",
      "Driver dashboard — earnings, trips, ratings, online/offline",
      "Live inquiry feed (filter by city, vehicle type, distance)",
      "Accept / reject inquiry → auto-assign to driver",
      "Driver wallet & weekly settlement",
      "Driver referral program (₹500 per referred driver who completes 10 rides)",
      "Driver chat with admin / customer (in-app)",
      "GPS tracking + live trip status",
      "Rating & review collection (driver ↔ customer)",
      "Push notifications for new inquiries",
      "Driver leaderboard & incentives",
    ],
  },
  {
    title: "Admin panel",
    subtitle: "Currently available at /admin · login: admin@rkpooja.in / admin@123",
    color: "#0A2E6D",
    icon: BarChart3,
    done: [
      "KPI cards — total inquiries, users, hot leads, est. revenue",
      "Leads table — filter by status / score / service / search",
      "Update inquiry status (new → contacted → quoted → converted → closed)",
      "One-click WhatsApp from any lead row",
      "Analytics charts — service mix (bar), lead score split (pie), funnel, 7-day trend",
      "Users management — wallet balance, referral code, admin-credit wallet",
      "Referrals leaderboard",
      "Transactions audit log",
    ],
    todo: [
      "Driver management module (after driver app is built)",
      "Dispatch board — drag inquiry → driver",
      "WhatsApp Business inbox integration (two-way auto-reply)",
      "Bulk SMS / email blasts",
      "Coupon / promo manager",
      "Settings page (WhatsApp number, rates, languages, banners)",
      "Audit log of admin actions",
      "Role-based access — manager, dispatcher, accountant",
      "Export (Excel / Google Sheets sync)",
    ],
  },
  {
    title: "Platform / Infra",
    subtitle: "Foundation that everything runs on",
    color: "#16A34A",
    icon: Headphones,
    done: [
      "FastAPI backend + MongoDB (async motor)",
      "Claude Sonnet 4.5 integration (Emergent Universal Key)",
      "OpenStreetMap (Nominatim + OSRM) — no API key, no cost",
      "JWT auth with seeded admin",
      "Service worker + offline app shell",
      "Brand system (#0A2E6D, #FF7A00, Outfit + Manrope, custom logo)",
    ],
    todo: [
      "Production deployment (Docker / Vercel / Railway)",
      "CI/CD with GitHub Actions",
      "Monitoring (Sentry, PostHog already wired)",
      "Rate limiting + Nominatim caching layer",
      "Stripe/Razorpay live keys",
      "Multi-tenant city support (Patna, Delhi, Mumbai, Bangalore separate dashboards)",
      "SEO landing pages per city × service (e.g., /patna/sedan)",
      "Admin role-based access control",
    ],
  },
];

export default function Roadmap() {
  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" data-testid="roadmap-page">
      <div className="text-xs uppercase font-bold tracking-widest text-rk-orange">Product roadmap</div>
      <h1 className="font-heading font-extrabold text-3xl sm:text-5xl text-rk-navy mt-2 tracking-tight">
        What's shipped — and what's next
      </h1>
      <p className="text-rk-muted mt-3 max-w-2xl">
        RK POOJA is built as <b>two separate apps</b>: this <b>customer PWA</b> (live now) and a
        <b> driver / partner app</b> (next phase). The admin panel orchestrates both.
      </p>

      <div className="mt-10 grid md:grid-cols-2 gap-6">
        {SECTIONS.map((s) => (
          <SectionCard key={s.title} section={s} />
        ))}
      </div>

      <div className="mt-12 rounded-2xl bg-rk-navy text-white p-8 sm:p-10">
        <div className="text-xs uppercase font-bold tracking-widest text-rk-orange">Phasing recommendation</div>
        <h2 className="font-heading font-bold text-2xl sm:text-3xl mt-2">Suggested next 3 sprints</h2>
        <ol className="mt-5 space-y-3 text-sm">
          <li className="flex gap-3"><Pill n="1" /><span><b>Driver onboarding MVP</b> — separate signup, KYC upload, vehicle profile, live inquiry feed, basic accept-flow. Bridges the marketplace.</span></li>
          <li className="flex gap-3"><Pill n="2" /><span><b>Two-way WhatsApp automation</b> — replace wa.me deep-link with WhatsApp Business webhook. Auto-reply with quote, status updates, driver assignment.</span></li>
          <li className="flex gap-3"><Pill n="3" /><span><b>Stripe/Razorpay top-up</b> + <b>SMS OTP login</b> + push notifications — close the monetisation + retention loop.</span></li>
        </ol>
      </div>

      <div className="text-center mt-12">
        <Link to="/" className="text-rk-orange font-semibold underline">← Back to home</Link>
      </div>
    </div>
  );
}

function SectionCard({ section }) {
  const Icon = section.icon;
  const totalDone = section.done.length;
  const totalTodo = section.todo.length;
  const total = totalDone + totalTodo;
  const pct = total > 0 ? Math.round((totalDone / total) * 100) : 0;
  return (
    <div className="rounded-2xl bg-white border border-rk-border p-6" data-testid={`roadmap-section-${section.title}`}>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl grid place-items-center text-white" style={{ background: section.color }}>
          <Icon size={22} />
        </div>
        <div className="flex-1">
          <h3 className="font-heading font-bold text-xl text-rk-navy leading-tight">{section.title}</h3>
          <div className="text-xs text-rk-muted">{section.subtitle}</div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-rk-muted">
        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-rk-orange" style={{ width: `${pct}%` }} />
        </div>
        <span><b className="text-rk-ink">{totalDone}</b> / {total} done · {pct}%</span>
      </div>

      {totalDone > 0 && (
        <>
          <div className="mt-5 text-[11px] uppercase tracking-widest font-bold text-green-600">Shipped</div>
          <ul className="mt-2 space-y-1.5">
            {section.done.map((d) => (
              <li key={d} className="flex items-start gap-2 text-sm text-rk-ink">
                <CheckCircle2 size={14} className="text-green-600 mt-0.5 shrink-0" /> {d}
              </li>
            ))}
          </ul>
        </>
      )}

      {totalTodo > 0 && (
        <>
          <div className="mt-5 text-[11px] uppercase tracking-widest font-bold text-rk-orange">Pending</div>
          <ul className="mt-2 space-y-1.5">
            {section.todo.map((d) => (
              <li key={d} className="flex items-start gap-2 text-sm text-rk-muted">
                <Circle size={14} className="text-rk-orange mt-0.5 shrink-0" /> {d}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Pill({ n }) {
  return (
    <span className="w-7 h-7 rounded-full bg-rk-orange grid place-items-center text-white font-bold text-xs shrink-0">{n}</span>
  );
}
