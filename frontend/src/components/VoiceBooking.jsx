import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Mic, MicOff, Loader2, ArrowRight, AlertCircle } from "lucide-react";
import { api } from "../lib/api";
import { useLang } from "../lib/language-context";
import { toast } from "sonner";

const LANG_BCP = {
  en: "en-IN", hi: "hi-IN", mr: "mr-IN", gu: "gu-IN", bn: "bn-IN",
  ta: "ta-IN", te: "te-IN", kn: "kn-IN", ml: "ml-IN", pa: "pa-IN",
};

export function VoiceBooking({ open, onOpenChange }) {
  const { lang } = useLang();
  const navigate = useNavigate();
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [error, setError] = useState("");
  const recRef = useRef(null);

  const supported = typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  useEffect(() => {
    if (!open) {
      try { recRef.current?.stop(); } catch {}
      setListening(false);
      setTranscript(""); setInterim(""); setParsed(null); setError("");
    }
  }, [open]);

  const start = () => {
    setError("");
    if (!supported) {
      setError("Voice recognition is not supported in this browser. Please type your request in the AI chat.");
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = LANG_BCP[lang] || "en-IN";
    rec.interimResults = true;
    rec.continuous = true;

    let finalText = "";
    rec.onresult = (e) => {
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t + " ";
        else interimText += t;
      }
      setTranscript(finalText.trim());
      setInterim(interimText);
    };
    rec.onerror = (e) => {
      setError("Mic error: " + e.error);
      setListening(false);
    };
    rec.onend = () => setListening(false);
    rec.start();
    recRef.current = rec;
    setListening(true);
  };

  const stop = () => {
    try { recRef.current?.stop(); } catch {}
    setListening(false);
  };

  const parse = async () => {
    const text = (transcript + " " + interim).trim();
    if (!text) { setError("Please speak something first."); return; }
    setParsing(true); setError("");
    try {
      const { data } = await api.post("/ai/voice-parse", { transcript: text, language: lang });
      if (data.error) {
        setError("Couldn't parse. Try again.");
      } else {
        setParsed(data);
      }
    } catch (e) {
      setError("Network error. Please try again.");
    } finally {
      setParsing(false);
    }
  };

  const goCreate = () => {
    if (!parsed?.service_type) {
      toast.error("Service not detected. Please try again.");
      return;
    }
    const params = new URLSearchParams();
    Object.entries(parsed).forEach(([k, v]) => {
      if (v != null && v !== "") params.set(k, String(v));
    });
    onOpenChange(false);
    navigate(`/services/${parsed.service_type}?${params.toString()}`);
  };

  const startRideNow = async () => {
    if (!parsed?.service_type) {
      toast.error("Service not detected. Please try again.");
      return;
    }
    setParsing(true);
    try {
      const payload = {
        service_type: parsed.service_type,
        sub_service: parsed.sub_service || null,
        vehicle_category: parsed.vehicle_category || null,
        pickup: parsed.pickup || "Current location",
        destination: parsed.destination || null,
        journey_date: parsed.journey_date || null,
        journey_time: parsed.journey_time || null,
        passengers: parsed.passengers ? Number(parsed.passengers) : null,
        weight_kg: parsed.weight_kg ? Number(parsed.weight_kg) : null,
        goods_type: parsed.goods_type || null,
        purpose: parsed.purpose || null,
        language: lang,
        source: "voice",
      };
      const { data } = await api.post("/inquiries", payload);
      toast.success("Ride request placed! Opening WhatsApp…");
      // Send to WhatsApp
      const { buildInquiryWhatsApp } = await import("../lib/whatsapp");
      const url = buildInquiryWhatsApp({ inquiry: data, number: "919955095226" });
      window.open(url, "_blank", "noreferrer");
      onOpenChange(false);
      navigate(`/dashboard`);
    } catch (e) {
      toast.error("Could not place ride request. Try again.");
    } finally {
      setParsing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="voice-booking-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl text-rk-navy">
            AI Voice Booking
          </DialogTitle>
          <p className="text-sm text-rk-muted">
            Speak naturally — like "Need a sedan from Patna to Gaya tomorrow."
          </p>
        </DialogHeader>

        <div className="flex flex-col items-center py-4">
          <button
            onClick={listening ? stop : start}
            className={`relative w-24 h-24 rounded-full grid place-items-center text-white shadow-2xl transition ${
              listening ? "bg-red-500" : "bg-rk-orange hover:bg-rk-orange-600"
            }`}
            data-testid="voice-mic-button"
          >
            {listening && (
              <span className="absolute inset-0 rounded-full bg-rk-orange/50 animate-pulse-ring" />
            )}
            {listening ? <MicOff size={32} /> : <Mic size={32} />}
          </button>
          <div className="text-xs uppercase tracking-widest mt-3 font-bold text-rk-muted">
            {listening ? "Listening…" : "Tap to speak"}
          </div>
        </div>

        <div
          className="min-h-[80px] bg-slate-50 border border-rk-border rounded-xl p-3 text-sm"
          data-testid="voice-transcript"
        >
          {transcript || interim ? (
            <>
              <span className="text-rk-ink">{transcript}</span>
              <span className="text-rk-muted italic">{interim}</span>
            </>
          ) : (
            <span className="text-rk-muted">Your transcript will appear here…</span>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 text-sm text-red-600 mt-2" data-testid="voice-error">
            <AlertCircle size={14} className="mt-0.5" /> {error}
          </div>
        )}

        {!parsed ? (
          <Button
            onClick={parse}
            disabled={parsing || (!transcript && !interim)}
            className="w-full bg-rk-navy hover:bg-rk-navy-700 text-white mt-3 h-12"
            data-testid="voice-parse-button"
          >
            {parsing ? <><Loader2 size={16} className="animate-spin mr-2" /> Extracting trip…</> : "Extract trip with AI"}
          </Button>
        ) : (
          <div className="mt-3 border border-rk-orange/30 bg-rk-orange/5 rounded-xl p-4" data-testid="voice-parsed-result">
            <div className="text-xs font-bold uppercase tracking-widest text-rk-orange mb-2">AI Extracted</div>
            <ul className="text-sm space-y-1 text-rk-ink">
              {parsed.service_type && <li><b>Service:</b> {parsed.service_type}</li>}
              {parsed.vehicle_category && <li><b>Vehicle:</b> {parsed.vehicle_category}</li>}
              {parsed.pickup && <li><b>Pickup:</b> {parsed.pickup}</li>}
              {parsed.destination && <li><b>Destination:</b> {parsed.destination}</li>}
              {parsed.journey_date && <li><b>Date:</b> {parsed.journey_date}</li>}
              {parsed.passengers && <li><b>Passengers:</b> {parsed.passengers}</li>}
              {parsed.summary && <li className="text-rk-muted italic">{parsed.summary}</li>}
            </ul>
            <Button
              onClick={startRideNow}
              disabled={parsing}
              className="w-full bg-rk-orange hover:bg-rk-orange-600 text-white mt-4 h-12 font-bold"
              data-testid="voice-start-ride"
            >
              {parsing ? <><Loader2 size={16} className="animate-spin mr-2" /> Placing…</> : <>🚗 Start ride now & send to WhatsApp</>}
            </Button>
            <Button
              onClick={goCreate}
              variant="outline"
              className="w-full mt-2"
              data-testid="voice-continue-button"
            >
              Edit details first <ArrowRight size={16} className="ml-1" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
