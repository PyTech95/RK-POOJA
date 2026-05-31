import { useParams, Link, Navigate } from "react-router-dom";
import { getService, SERVICES } from "../lib/services";
import { InquiryForm } from "../components/InquiryForm";
import { ChevronRight } from "lucide-react";

export default function ServicePage() {
  const { type } = useParams();
  const service = getService(type);
  if (!service) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen" data-testid={`service-page-${type}`}>
      <div
        className="relative text-white"
        style={{
          background:
            `linear-gradient(135deg, rgba(10,46,109,0.92), rgba(10,46,109,0.78)), url(${service.image}) center/cover`,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="flex items-center gap-2 text-xs text-white/70 mb-4">
            <Link to="/" className="hover:text-rk-orange">Home</Link>
            <ChevronRight size={12} />
            <span>Services</span>
            <ChevronRight size={12} />
            <span className="text-white font-semibold">{service.name}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-rk-orange grid place-items-center">
              <service.Icon size={26} />
            </div>
            <div>
              <div className="text-xs uppercase font-bold tracking-widest text-rk-orange">{service.short}</div>
              <h1 className="font-heading font-extrabold text-3xl sm:text-4xl mt-1 tracking-tight">{service.name}</h1>
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-white/80">{service.desc}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <InquiryForm service={service} />
        </div>
        <aside className="space-y-4">
          <div className="rounded-2xl border border-rk-border bg-white p-5">
            <div className="text-xs uppercase font-bold tracking-widest text-rk-orange">Other services</div>
            <div className="mt-3 space-y-2">
              {SERVICES.filter((s) => s.key !== service.key).map((s) => (
                <Link
                  key={s.key}
                  to={`/services/${s.key}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition"
                  data-testid={`other-service-${s.key}`}
                >
                  <div className="w-9 h-9 rounded-lg bg-rk-navy/5 text-rk-navy grid place-items-center">
                    <s.Icon size={16} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-rk-ink">{s.name}</div>
                    <div className="text-xs text-rk-muted">{s.short}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-rk-navy text-white p-5">
            <div className="text-xs uppercase font-bold tracking-widest text-rk-orange">Need help?</div>
            <div className="font-heading font-bold mt-1">Talk to our team</div>
            <p className="text-sm text-white/70 mt-2">
              We're available 24×7 in 12 Indian languages.
            </p>
            <a
              href="https://wa.me/919955095226"
              target="_blank" rel="noreferrer"
              className="mt-3 block text-center bg-rk-orange hover:bg-rk-orange-600 text-white rounded-full py-2.5 font-semibold"
              data-testid="aside-whatsapp"
            >
              Open WhatsApp
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
}
