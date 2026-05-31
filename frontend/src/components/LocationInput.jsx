import { useEffect, useRef, useState } from "react";
import { MapPin, Loader2, LocateFixed } from "lucide-react";
import { Input } from "./ui/input";
import { api } from "../lib/api";

/**
 * Free OpenStreetMap Nominatim autocomplete — no API key needed.
 * Stores lat/lon on selection (passed back through `onSelect`).
 * Adds a "Use my location" button that auto-detects via browser geolocation +
 * reverse-geocodes through our backend.
 */
export function LocationInput({
  value, onChange, onSelect,
  placeholder = "Search city, area, landmark…", testId, className = "",
  enableLocate = true,
}) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const wrapperRef = useRef(null);
  const ctrlRef = useRef(null);
  const lastSelectedRef = useRef("");

  useEffect(() => {
    if (!value || value.trim().length < 3) { setResults([]); return; }
    if (value === lastSelectedRef.current) return;
    const handle = setTimeout(async () => {
      try {
        ctrlRef.current?.abort();
        ctrlRef.current = new AbortController();
        setLoading(true);
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=in&limit=6&q=${encodeURIComponent(value)}`;
        const r = await fetch(url, { signal: ctrlRef.current.signal, headers: { "Accept": "application/json" } });
        const data = await r.json();
        setResults(Array.isArray(data) ? data : []);
        setOpen(true);
      } catch (e) {
        if (e.name !== "AbortError") setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [value]);

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (item) => {
    const text = formatName(item);
    lastSelectedRef.current = text;
    onChange(text);
    onSelect?.({ display_name: text, lat: parseFloat(item.lat), lon: parseFloat(item.lon) });
    setOpen(false);
  };

  const locate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lon } = pos.coords;
          const { data } = await api.post("/geo/reverse", { lat, lon });
          const text = data.display_name;
          lastSelectedRef.current = text;
          onChange(text);
          onSelect?.({ display_name: text, lat, lon });
        } finally {
          setLocating(false);
        }
      },
      () => setLocating(false),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        placeholder={placeholder}
        className={`h-12 pl-9 ${enableLocate ? "pr-11" : ""}`}
        data-testid={testId}
        autoComplete="off"
      />
      <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-rk-orange pointer-events-none" />
      {enableLocate && (
        <button
          type="button"
          onClick={locate}
          disabled={locating}
          aria-label="Use my current location"
          title="Use my current location"
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-md grid place-items-center text-rk-navy hover:bg-rk-orange/10 transition disabled:opacity-60"
          data-testid={`${testId}-locate`}
        >
          {locating ? <Loader2 size={14} className="animate-spin" /> : <LocateFixed size={16} />}
        </button>
      )}
      {!enableLocate && loading && (
        <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-rk-muted" />
      )}
      {open && results.length > 0 && (
        <div
          className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-rk-border rounded-xl shadow-xl overflow-hidden"
          data-testid={`${testId}-dropdown`}
        >
          {results.map((r, i) => (
            <button
              type="button"
              key={`${r.place_id}-${i}`}
              onClick={() => pick(r)}
              className="w-full text-left px-4 py-2.5 hover:bg-slate-50 border-b border-rk-border last:border-b-0 flex items-start gap-2"
            >
              <MapPin size={14} className="mt-0.5 text-rk-orange shrink-0" />
              <div className="text-sm leading-snug">
                <div className="font-semibold text-rk-ink">{primaryName(r)}</div>
                <div className="text-xs text-rk-muted">{secondaryName(r)}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function primaryName(r) {
  return (
    r.address?.city || r.address?.town || r.address?.village ||
    r.address?.suburb || r.address?.neighbourhood || r.name ||
    r.display_name.split(",")[0]
  );
}
function secondaryName(r) {
  const parts = (r.display_name || "").split(",").map((s) => s.trim()).slice(1, 4);
  return parts.join(", ");
}
function formatName(r) {
  return `${primaryName(r)}, ${(r.address?.state || r.display_name.split(",").slice(-3, -2)[0] || "India").trim()}`;
}
