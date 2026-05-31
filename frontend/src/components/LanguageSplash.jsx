import { useState } from "react";
import { useLang } from "../lib/language-context";
import { Volume2, ArrowRight, Globe } from "lucide-react";

/**
 * Full-screen first-run language splash.
 * - Shown ONCE before the user has chosen a language.
 * - Each language tile has a 🔊 "Listen" button (browser TTS) so users
 *   who can't read English can still find their language.
 * - Cannot be dismissed without picking — so non-technical users never get stuck on a wrong language.
 */
export function LanguageSplash() {
  const { lang, setLang, languages, firstRun, completeFirstRun } = useLang();
  const [previewing, setPreviewing] = useState(null);

  if (!firstRun) return null;

  const speak = (l) => {
    try {
      const u = new SpeechSynthesisUtterance(
        l.code === "en" ? "Choose English to continue" :
        l.code === "hi" ? "जारी रखने के लिए हिंदी चुनें" :
        l.code === "mr" ? "मराठी निवडा" :
        l.code === "gu" ? "ગુજરાતી પસંદ કરો" :
        l.code === "bn" ? "বাংলা নির্বাচন করুন" :
        l.code === "ta" ? "தமிழ் தேர்ந்தெடுக்கவும்" :
        l.code === "te" ? "తెలుగు ఎంచుకోండి" :
        l.code === "kn" ? "ಕನ್ನಡ ಆಯ್ಕೆಮಾಡಿ" :
        l.code === "ml" ? "മലയാളം തിരഞ്ഞെടുക്കുക" :
        l.code === "pa" ? "ਪੰਜਾਬੀ ਚੁਣੋ" :
        l.code === "or" ? "ଓଡ଼ିଆ ବାଛନ୍ତୁ" : "অসমীয়া বাছনি কৰক"
      );
      const langMap = { en: "en-IN", hi: "hi-IN", mr: "mr-IN", gu: "gu-IN", bn: "bn-IN",
        ta: "ta-IN", te: "te-IN", kn: "kn-IN", ml: "ml-IN", pa: "pa-IN", or: "or-IN", as: "as-IN" };
      u.lang = langMap[l.code] || "en-IN";
      u.rate = 0.9;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
      setPreviewing(l.code);
      setTimeout(() => setPreviewing(null), 2500);
    } catch {}
  };

  const pick = (code) => {
    setLang(code);
  };

  const cont = () => {
    completeFirstRun();
    // speak welcome in chosen language
    try {
      const welcome = {
        en: "Welcome to RK POOJA. One app for all rides.",
        hi: "RK POOJA में आपका स्वागत है. एक ऐप, हर सवारी.",
        mr: "RK POOJA मध्ये स्वागत आहे.",
        gu: "RK POOJA માં આપનું સ્વાગત છે.",
        bn: "RK POOJA-তে স্বাগতম.",
        ta: "RK POOJA-வுக்கு வரவேற்கிறோம்.",
        te: "RK POOJA కు స్వాగతం.",
        kn: "RK POOJA ಗೆ ಸ್ವಾಗತ.",
        ml: "RK POOJA-യിലേക്ക് സ്വാഗതം.",
        pa: "RK POOJA ਵਿੱਚ ਜੀ ਆਇਆਂ ਨੂੰ.",
        or: "RK POOJA ରେ ସ୍ୱାଗତ.",
        as: "RK POOJA-লৈ স্বাগতম.",
      };
      const u = new SpeechSynthesisUtterance(welcome[lang] || welcome.en);
      const langMap = { en: "en-IN", hi: "hi-IN", mr: "mr-IN", gu: "gu-IN", bn: "bn-IN",
        ta: "ta-IN", te: "te-IN", kn: "kn-IN", ml: "ml-IN", pa: "pa-IN", or: "or-IN", as: "as-IN" };
      u.lang = langMap[lang] || "en-IN";
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-[100] bg-rk-navy text-white overflow-y-auto" data-testid="language-splash">
      <div className="rk-hero-bg absolute inset-0 opacity-90" />
      <div className="absolute inset-0 rk-grain opacity-[0.08]" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-8 py-8 sm:py-12 min-h-full flex flex-col">
        <div className="flex items-center justify-between">
          <div className="bg-white rounded-2xl p-3 inline-flex">
            <img src="/logo.png" alt="RK POOJA" className="h-16 sm:h-20 w-auto" />
          </div>
          <div className="inline-flex items-center gap-2 bg-rk-orange/20 border border-rk-orange/40 px-3 py-1.5 rounded-full">
            <Globe size={14} className="text-rk-orange" />
            <span className="text-[11px] font-bold uppercase tracking-widest">Step 1 of 1</span>
          </div>
        </div>

        <div className="mt-8 sm:mt-10">
          <h1 className="font-heading font-black text-3xl sm:text-5xl tracking-tight leading-tight">
            Choose your language
          </h1>
          <p className="font-heading text-lg sm:text-2xl text-white/85 mt-2">
            अपनी भाषा चुनें · ভাষা বাছুন · மொழியைத் தேர்ந்தெடுக்கவும்
          </p>
          <p className="text-sm text-white/60 mt-3 max-w-xl">
            Tap any tile to choose. Tap <Volume2 size={14} className="inline mx-1 text-rk-orange" /> to hear the language. You can change it anytime from the top menu.
          </p>
        </div>

        <div className="mt-7 grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {languages.map((l) => {
            const selected = lang === l.code;
            return (
              <button
                key={l.code}
                onClick={() => pick(l.code)}
                data-testid={`splash-lang-${l.code}`}
                className={`relative rounded-2xl border-2 p-4 sm:p-5 text-left transition-all ${
                  selected
                    ? "border-rk-orange bg-rk-orange/15 scale-[1.02] shadow-xl"
                    : "border-white/15 bg-white/5 hover:border-white/40 hover:bg-white/10"
                }`}
              >
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); speak(l); }}
                  className={`absolute top-2 right-2 w-9 h-9 rounded-full grid place-items-center transition ${
                    previewing === l.code ? "bg-rk-orange text-white" : "bg-white/10 hover:bg-rk-orange hover:text-white"
                  }`}
                  data-testid={`splash-listen-${l.code}`}
                  aria-label={`Listen to ${l.name}`}
                >
                  <Volume2 size={14} />
                </button>
                <div className="font-heading font-extrabold text-2xl sm:text-3xl leading-tight pr-9">
                  {l.native}
                </div>
                <div className="text-xs uppercase tracking-widest text-white/60 mt-1 font-bold">
                  {l.name}
                </div>
                {selected && (
                  <div className="absolute bottom-2 left-2 text-[10px] font-bold uppercase tracking-widest bg-rk-orange text-white px-2 py-0.5 rounded-full">
                    Selected ✓
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-auto pt-8 sticky bottom-0 left-0 right-0">
          <button
            onClick={cont}
            data-testid="splash-continue"
            className="w-full sm:w-auto sm:ml-auto sm:flex bg-rk-orange hover:bg-rk-orange-600 text-white font-bold rounded-full h-14 px-8 text-base shadow-2xl shadow-rk-orange/40 inline-flex items-center justify-center gap-2"
          >
            Continue <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
