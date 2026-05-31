import { Link, NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Logo } from "./Logo";
import { useAuth } from "../lib/auth-context";
import { useLang } from "../lib/language-context";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { Globe, Menu, X, LogOut, LayoutDashboard, ShieldCheck, User as UserIcon, Wallet, Gift, Map } from "lucide-react";

export function Header() {
  const { user, logout } = useAuth();
  const { lang, setLang, t, languages, setShowPicker } = useLang();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { to: "/", label: "Home" },
    { to: "/services/car", label: "Car" },
    { to: "/services/tempo", label: "Tempo" },
    { to: "/services/bus", label: "Bus" },
    { to: "/services/porter", label: "Porter" },
    { to: "/services/goods", label: "Goods" },
    { to: "/roadmap", label: "Roadmap" },
  ];

  return (
    <header
      className="sticky top-0 z-40 backdrop-blur-md border-b border-rk-border"
      style={{ background: "rgba(255,255,255,0.85)" }}
      data-testid="site-header"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 shrink-0" data-testid="header-logo-link">
          <Logo size={32} />
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              data-testid={`nav-${n.label.toLowerCase()}`}
              className={({ isActive }) =>
                `px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-rk-navy text-white"
                    : "text-rk-ink hover:bg-slate-100"
                }`
              }
              end={n.to === "/"}
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 hidden sm:flex"
                data-testid="lang-switcher-button"
              >
                <Globe size={16} />
                <span className="text-xs font-semibold uppercase">{lang}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
              {languages.map((l) => (
                <DropdownMenuItem
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  data-testid={`lang-option-${l.code}`}
                  className={lang === l.code ? "bg-rk-orange/10 text-rk-navy font-semibold" : ""}
                >
                  <span className="w-10 text-xs uppercase text-rk-muted">{l.code}</span>
                  <span>{l.native}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowPicker(true)} data-testid="lang-open-picker">
                More options…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2" data-testid="user-menu-button">
                  <div className="w-7 h-7 rounded-full bg-rk-navy text-white grid place-items-center text-xs font-bold">
                    {user.name?.[0]?.toUpperCase() || "U"}
                  </div>
                  <span className="hidden sm:inline text-sm font-medium">{user.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate("/dashboard")} data-testid="menu-dashboard">
                  <LayoutDashboard size={14} className="mr-2" /> {t("dashboard")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/dashboard?tab=wallet")} data-testid="menu-wallet">
                  <Wallet size={14} className="mr-2" /> Wallet
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/dashboard?tab=referral")} data-testid="menu-referral">
                  <Gift size={14} className="mr-2" /> Refer & earn
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/dashboard?tab=profile")} data-testid="menu-profile">
                  <UserIcon size={14} className="mr-2" /> {t("profile")}
                </DropdownMenuItem>
                {user.role === "admin" && (
                  <DropdownMenuItem onClick={() => navigate("/admin")} data-testid="menu-admin">
                    <ShieldCheck size={14} className="mr-2" /> {t("admin")}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { logout(); navigate("/"); }} data-testid="menu-logout">
                  <LogOut size={14} className="mr-2" /> {t("logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden sm:flex items-center gap-1">
              <Button asChild variant="ghost" size="sm" data-testid="header-login">
                <Link to="/login">{t("login")}</Link>
              </Button>
              <Button asChild size="sm" className="bg-rk-orange hover:bg-rk-orange-600 text-white rounded-full px-4" data-testid="header-signup">
                <Link to="/signup">{t("signup")}</Link>
              </Button>
            </div>
          )}

          <button
            className="md:hidden p-2 rounded-md border border-rk-border"
            onClick={() => setMobileOpen((v) => !v)}
            data-testid="mobile-menu-toggle"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-rk-border bg-white" data-testid="mobile-menu">
          <div className="px-4 py-3 space-y-1">
            {navItems.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === "/"}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-lg text-sm font-medium ${
                    isActive ? "bg-rk-navy text-white" : "text-rk-ink hover:bg-slate-100"
                  }`
                }
                data-testid={`mobile-nav-${n.label.toLowerCase()}`}
              >
                {n.label}
              </NavLink>
            ))}
            {!user && (
              <div className="flex gap-2 pt-2">
                <Button asChild variant="outline" className="flex-1" data-testid="mobile-login">
                  <Link to="/login">{t("login")}</Link>
                </Button>
                <Button asChild className="flex-1 bg-rk-orange hover:bg-rk-orange-600 text-white" data-testid="mobile-signup">
                  <Link to="/signup">{t("signup")}</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
