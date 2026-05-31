import { useEffect, useState } from "react";
import { Download, Smartphone, X } from "lucide-react";
import { Button } from "./ui/button";

/**
 * PWA install button. Listens for beforeinstallprompt and exposes a CTA.
 * Falls back to a "how to install" sheet on iOS / when the event is unavailable.
 */
export function InstallAppButton({ variant = "primary", className = "", label = "Start the app" }) {
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const onBefore = (e) => {
      e.preventDefault();
      setDeferred(e);
    };
    const onInstalled = () => { setInstalled(true); setDeferred(null); };
    window.addEventListener("beforeinstallprompt", onBefore);
    window.addEventListener("appinstalled", onInstalled);

    // Check if already running as standalone
    if (window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone) {
      setInstalled(true);
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onBefore);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const click = async () => {
    if (deferred) {
      deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice?.outcome === "accepted") setInstalled(true);
      setDeferred(null);
    } else {
      setShowHelp(true);
    }
  };

  if (installed) return null;

  const base = variant === "primary"
    ? "bg-rk-orange hover:bg-rk-orange-600 text-white shadow-2xl shadow-rk-orange/40"
    : "bg-white text-rk-navy hover:bg-slate-50 border border-rk-border";

  return (
    <>
      <Button
        onClick={click}
        className={`rounded-full h-14 px-7 text-base font-bold ${base} ${className}`}
        data-testid="install-app-button"
      >
        <Download className="mr-2" size={18} /> {label}
      </Button>

      {showHelp && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
          onClick={() => setShowHelp(false)}
          data-testid="install-help-modal"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-md w-full p-6 relative"
          >
            <button
              onClick={() => setShowHelp(false)}
              className="absolute top-3 right-3 p-1 rounded-full hover:bg-slate-100"
              aria-label="Close"
            >
              <X size={16} />
            </button>
            <div className="w-12 h-12 rounded-2xl bg-rk-orange/10 grid place-items-center">
              <Smartphone className="text-rk-orange" size={22} />
            </div>
            <h3 className="font-heading font-extrabold text-xl text-rk-navy mt-3">Add RK POOJA to your home screen</h3>
            <p className="text-sm text-rk-muted mt-2">
              Get one-tap access to all rides — works offline & feels like a native app.
            </p>
            <div className="mt-5 space-y-3 text-sm text-rk-ink">
              <Step n="1" text="Open this page in Safari (iOS) or Chrome (Android)" />
              <Step n="2" text="Tap the Share icon ↗ on iOS, or the ⋮ menu on Android" />
              <Step n="3" text='Choose "Add to Home Screen"' />
              <Step n="4" text="Open RK POOJA from your home screen any time" />
            </div>
            <Button
              onClick={() => setShowHelp(false)}
              className="w-full mt-5 bg-rk-navy hover:bg-rk-navy-700 text-white rounded-full"
            >
              Got it
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

function Step({ n, text }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-6 h-6 rounded-full bg-rk-orange text-white grid place-items-center text-xs font-bold shrink-0">{n}</div>
      <span>{text}</span>
    </div>
  );
}
