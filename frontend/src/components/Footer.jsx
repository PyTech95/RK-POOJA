import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import { Phone, Mail, MapPin } from "lucide-react";
import { SERVICES } from "../lib/services";

export function Footer() {
  return (
    <footer className="bg-rk-navy text-white mt-24" data-testid="site-footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid md:grid-cols-4 gap-10">
        <div>
          <div className="bg-white rounded-xl inline-flex p-3">
            <Logo size={34} />
          </div>
          <p className="mt-4 text-sm text-white/70 leading-relaxed">
            India's AI-powered ride & transport marketplace. From quick autos to
            luxury coaches and goods transport — one app for every trip.
          </p>
          <div className="mt-5 flex gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-widest bg-white/10 px-2 py-1 rounded">Safe & Reliable</span>
            <span className="text-[10px] font-bold uppercase tracking-widest bg-white/10 px-2 py-1 rounded">On-time</span>
            <span className="text-[10px] font-bold uppercase tracking-widest bg-rk-orange/20 text-rk-orange px-2 py-1 rounded">24×7 Support</span>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-widest text-white/60 mb-4">Services</h4>
          <ul className="space-y-2 text-sm">
            {SERVICES.map((s) => (
              <li key={s.key}>
                <Link to={`/services/${s.key}`} className="text-white/80 hover:text-rk-orange transition" data-testid={`footer-service-${s.key}`}>
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-widest text-white/60 mb-4">Company</h4>
          <ul className="space-y-2 text-sm text-white/80">
            <li><Link to="/" className="hover:text-rk-orange">About</Link></li>
            <li><Link to="/" className="hover:text-rk-orange">How it works</Link></li>
            <li><Link to="/" className="hover:text-rk-orange">Popular routes</Link></li>
            <li><Link to="/dashboard" className="hover:text-rk-orange">User dashboard</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-widest text-white/60 mb-4">Contact</h4>
          <ul className="space-y-3 text-sm text-white/80">
            <li className="flex items-center gap-2"><Phone size={14} className="text-rk-orange" /> +91 99999 99999</li>
            <li className="flex items-center gap-2"><Mail size={14} className="text-rk-orange" /> hello@rkpooja.in</li>
            <li className="flex items-start gap-2"><MapPin size={14} className="text-rk-orange mt-0.5" /> Pan-India operations · HQ Patna, Bihar</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 py-5 text-center text-xs text-white/50">
        © {new Date().getFullYear()} RK POOJA. All rights reserved. · ONE APP. ALL RIDES.
      </div>
    </footer>
  );
}
