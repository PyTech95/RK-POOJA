import { useLang } from "../lib/language-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Languages } from "lucide-react";

export function LanguagePicker() {
  const { showPicker, setShowPicker, lang, setLang, languages } = useLang();
  return (
    <Dialog open={showPicker} onOpenChange={setShowPicker}>
      <DialogContent className="max-w-md" data-testid="language-picker-modal">
        <DialogHeader>
          <div className="w-12 h-12 rounded-2xl bg-rk-orange/10 grid place-items-center mb-3">
            <Languages className="text-rk-orange" size={22} />
          </div>
          <DialogTitle className="font-heading font-bold text-2xl text-rk-navy">
            Choose your preferred language
          </DialogTitle>
          <DialogDescription className="text-sm text-rk-muted">
            अपनी पसंदीदा भाषा चुनें — Switch anytime from the header.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 mt-2 max-h-[60vh] overflow-y-auto no-scrollbar">
          {languages.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              data-testid={`lang-picker-${l.code}`}
              className={`text-left rounded-xl border p-3 transition ${
                lang === l.code
                  ? "border-rk-orange bg-rk-orange/5"
                  : "border-rk-border hover:border-rk-navy"
              }`}
            >
              <div className="font-heading font-bold text-rk-ink">{l.native}</div>
              <div className="text-xs text-rk-muted">{l.name}</div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
