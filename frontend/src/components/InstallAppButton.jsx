import { useEffect, useState } from "react";
import { Download, Smartphone, X } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";

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
      try {
        deferred.prompt();
        const choice = await deferred.userChoice;
        if (choice?.outcome === "accepted") setInstalled(true);
      } catch {}
      setDeferred(null);
      return;
    }
    // No native prompt available — always open the help modal so the click has feedback.
    setShowHelp(true);
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

      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="max-w-md" data-testid="install-help-modal">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-rk-orange/10 grid place-items-center mb-2">
              <Smartphone className="text-rk-orange" size={22} />
            </div>
            <DialogTitle className="font-heading font-extrabold text-2xl text-rk-navy">
              Add RK POOJA to your home screen
            </DialogTitle>
            <DialogDescription className="text-sm text-rk-muted">
              Get one-tap access to all rides — works offline & feels like a native app.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-rk-ink mt-2">
            <Step n="1" text="Open this page in Safari (iOS) or Chrome (Android)" />
            <Step n="2" text="Tap the Share icon ↗ on iOS, or the ⋮ menu on Android" />
            <Step n="3" text='Choose "Add to Home Screen"' />
            <Step n="4" text="Open RK POOJA from your home screen any time" />
          </div>
          <Button
            onClick={() => setShowHelp(false)}
            className="w-full mt-3 bg-rk-navy hover:bg-rk-navy-700 text-white rounded-full"
            data-testid="install-help-close"
          >
            Got it
          </Button>
        </DialogContent>
      </Dialog>
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
