import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Button } from "./ui/button";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { CalendarIcon, Sparkles, Loader2, CheckCircle2, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { api } from "../lib/api";
import { useLang } from "../lib/language-context";
import { useAuth } from "../lib/auth-context";
import { buildInquiryWhatsApp } from "../lib/whatsapp";
import { toast } from "sonner";
import { LocationInput } from "./LocationInput";

export function InquiryForm({ service }) {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const [search] = useSearchParams();

  const [form, setForm] = useState(() => ({
    service_type: service.key,
    sub_service: service.sub_services?.[0] || "",
    vehicle_category: service.categories?.[0] || "",
    pickup: "",
    destination: "",
    pickup_lat: null,
    pickup_lon: null,
    dest_lat: null,
    dest_lon: null,
    journey_date: "",
    return_date: "",
    journey_time: "",
    passengers: service.key === "bike" ? 1 : 2,
    weight_kg: "",
    goods_type: "",
    package_type: "",
    urgency: "",
    purpose: "",
    special_requirements: "",
    customer_name: user?.name || "",
    customer_phone: user?.phone || "",
    customer_email: user?.email || "",
    language: lang,
  }));
  const [date, setDate] = useState();
  const [returnDate, setReturnDate] = useState();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [quote, setQuote] = useState(null);

  // Pre-fill from URL params (from voice booking)
  useEffect(() => {
    const updates = {};
    search.forEach((v, k) => {
      if (k in form && v && v !== "null" && v !== "undefined") updates[k] = v;
    });
    if (Object.keys(updates).length) setForm((f) => ({ ...f, ...updates }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Estimate quote on key changes
  useEffect(() => {
    let cancelled = false;
    const debouncer = setTimeout(async () => {
      if (!form.pickup) { setQuote(null); return; }
      try {
        const { data } = await api.post("/ai/quote", {
          service_type: form.service_type,
          vehicle_category: form.vehicle_category,
          pickup: form.pickup,
          destination: form.destination || null,
          pickup_lat: form.pickup_lat,
          pickup_lon: form.pickup_lon,
          dest_lat: form.dest_lat,
          dest_lon: form.dest_lon,
          passengers: form.passengers ? Number(form.passengers) : null,
          weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
          journey_date: form.journey_date || null,
        });
        if (!cancelled) setQuote(data);
      } catch {}
    }, 500);
    return () => { cancelled = true; clearTimeout(debouncer); };
  }, [form.service_type, form.vehicle_category, form.pickup, form.destination, form.passengers, form.weight_kg, form.pickup_lat, form.dest_lat, form.journey_date]);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const isGoodsLike = service.key === "porter" || service.key === "goods";

  const submit = async (e) => {
    e.preventDefault();
    if (!form.pickup) { toast.error("Pickup is required"); return; }
    if (!form.customer_phone) { toast.error("Phone is required"); return; }
    setSubmitting(true);
    try {
      const payload = { ...form,
        passengers: form.passengers ? Number(form.passengers) : null,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
        language: lang,
      };
      const { data } = await api.post("/inquiries", payload);
      setResult(data);
      toast.success("Inquiry created! Tap WhatsApp to confirm.");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to submit inquiry");
    } finally {
      setSubmitting(false);
    }
  };

  const waUrl = useMemo(() => {
    if (!result) return null;
    return buildInquiryWhatsApp({ inquiry: result, number: "919999999999" });
  }, [result]);

  if (result) {
    return (
      <div className="rounded-2xl bg-white border border-rk-border p-6 sm:p-8" data-testid="inquiry-success">
        <div className="w-14 h-14 rounded-2xl bg-green-100 text-green-600 grid place-items-center mb-4">
          <CheckCircle2 size={26} />
        </div>
        <h3 className="font-heading font-bold text-2xl text-rk-navy">Inquiry submitted!</h3>
        <p className="text-rk-muted mt-1 text-sm">
          Inquiry ID: <span className="font-mono text-rk-ink">{result.id.slice(0, 8)}</span>
        </p>

        <div className="grid sm:grid-cols-2 gap-4 mt-6">
          <div className="rounded-xl bg-rk-orange/5 border border-rk-orange/30 p-4">
            <div className="text-xs uppercase font-bold tracking-widest text-rk-orange">{t("estimated")}</div>
            <div className="font-heading text-3xl font-extrabold text-rk-navy mt-1">
              ₹{result.quote_min?.toLocaleString()} – ₹{result.quote_max?.toLocaleString()}
            </div>
            <div className="text-xs text-rk-muted mt-1">≈ {result.distance_km} km · {t("final_quote")}</div>
          </div>
          <div className="rounded-xl bg-slate-50 border border-rk-border p-4">
            <div className="text-xs uppercase font-bold tracking-widest text-rk-muted">AI Lead Priority</div>
            <LeadBadge score={result.lead_score} />
            <div className="text-xs text-rk-muted mt-2">{result.lead_score_reason}</div>
          </div>
        </div>

        <a
          href={waUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1FB855] text-white font-semibold rounded-full px-6 py-3 w-full"
          data-testid="inquiry-whatsapp-cta"
        >
          <MessageCircle size={18} /> {t("book_now")}
        </a>

        <Button
          variant="ghost"
          className="w-full mt-2"
          onClick={() => { setResult(null); }}
          data-testid="inquiry-create-another"
        >
          Create another inquiry
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl bg-white border border-rk-border p-5 sm:p-7 space-y-5" data-testid="inquiry-form">
      <div>
        <div className="text-xs uppercase font-bold tracking-widest text-rk-orange">{service.name}</div>
        <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-rk-navy mt-1">Tell us your trip</h2>
        <p className="text-sm text-rk-muted mt-1">{service.desc}</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {service.sub_services?.length > 0 && (
          <div>
            <Label className="text-xs uppercase tracking-widest font-bold text-rk-muted">Service</Label>
            <Select value={form.sub_service} onValueChange={(v) => update("sub_service", v)}>
              <SelectTrigger className="h-12 mt-1" data-testid="inq-sub-service"><SelectValue /></SelectTrigger>
              <SelectContent>
                {service.sub_services.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        {service.categories?.length > 0 && (
          <div>
            <Label className="text-xs uppercase tracking-widest font-bold text-rk-muted">{t("vehicle_category")}</Label>
            <Select value={form.vehicle_category} onValueChange={(v) => update("vehicle_category", v)}>
              <SelectTrigger className="h-12 mt-1" data-testid="inq-vehicle-category"><SelectValue /></SelectTrigger>
              <SelectContent>
                {service.categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <Label className="text-xs uppercase tracking-widest font-bold text-rk-muted">{t("pickup")}</Label>
          <LocationInput
            value={form.pickup}
            onChange={(v) => update("pickup", v)}
            onSelect={(loc) => setForm((f) => ({ ...f, pickup: loc.display_name, pickup_lat: loc.lat, pickup_lon: loc.lon }))}
            placeholder="e.g. Patna, Bihar"
            testId="inq-pickup"
            className="mt-1"
          />
        </div>

        <div>
          <Label className="text-xs uppercase tracking-widest font-bold text-rk-muted">{t("destination")}</Label>
          <LocationInput
            value={form.destination}
            onChange={(v) => update("destination", v)}
            onSelect={(loc) => setForm((f) => ({ ...f, destination: loc.display_name, dest_lat: loc.lat, dest_lon: loc.lon }))}
            placeholder={service.key === "auto" || service.key === "bike" ? "Optional" : "e.g. Gaya, Bihar"}
            testId="inq-destination"
            className="mt-1"
          />
        </div>

        <div>
          <Label className="text-xs uppercase tracking-widest font-bold text-rk-muted">{t("date")}</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" className="h-12 mt-1 w-full justify-start font-normal" data-testid="inq-date">
                <CalendarIcon size={16} className="mr-2" />
                {date ? format(date, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={date} onSelect={(d) => {
                setDate(d); update("journey_date", d ? format(d, "yyyy-MM-dd") : "");
              }} initialFocus />
            </PopoverContent>
          </Popover>
        </div>

        {service.key === "bus" && (
          <div>
            <Label className="text-xs uppercase tracking-widest font-bold text-rk-muted">{t("return_date")}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" className="h-12 mt-1 w-full justify-start font-normal" data-testid="inq-return-date">
                  <CalendarIcon size={16} className="mr-2" />
                  {returnDate ? format(returnDate, "PPP") : "Optional"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={returnDate} onSelect={(d) => {
                  setReturnDate(d); update("return_date", d ? format(d, "yyyy-MM-dd") : "");
                }} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
        )}

        {!isGoodsLike && (
          <>
            <div>
              <Label className="text-xs uppercase tracking-widest font-bold text-rk-muted">{t("time")}</Label>
              <Input type="time" className="h-12 mt-1" value={form.journey_time} onChange={(e) => update("journey_time", e.target.value)} data-testid="inq-time" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest font-bold text-rk-muted">{t("passengers")}</Label>
              <Input type="number" min={1} className="h-12 mt-1" value={form.passengers}
                onChange={(e) => update("passengers", e.target.value)} data-testid="inq-passengers" />
            </div>
          </>
        )}

        {isGoodsLike && (
          <>
            <div>
              <Label className="text-xs uppercase tracking-widest font-bold text-rk-muted">Goods type</Label>
              <Input className="h-12 mt-1" value={form.goods_type} onChange={(e) => update("goods_type", e.target.value)}
                placeholder="e.g. Furniture, Documents" data-testid="inq-goods-type" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest font-bold text-rk-muted">Weight (kg)</Label>
              <Input type="number" min={0} className="h-12 mt-1" value={form.weight_kg}
                onChange={(e) => update("weight_kg", e.target.value)} data-testid="inq-weight" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest font-bold text-rk-muted">Urgency</Label>
              <Select value={form.urgency} onValueChange={(v) => update("urgency", v)}>
                <SelectTrigger className="h-12 mt-1" data-testid="inq-urgency"><SelectValue placeholder="Select urgency" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Same Day">Same Day</SelectItem>
                  <SelectItem value="Next Day">Next Day</SelectItem>
                  <SelectItem value="Within 3 Days">Within 3 Days</SelectItem>
                  <SelectItem value="Flexible">Flexible</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {service.key === "bus" && (
          <div className="sm:col-span-2">
            <Label className="text-xs uppercase tracking-widest font-bold text-rk-muted">Purpose</Label>
            <Select value={form.purpose} onValueChange={(v) => update("purpose", v)}>
              <SelectTrigger className="h-12 mt-1" data-testid="inq-purpose"><SelectValue placeholder="Choose purpose" /></SelectTrigger>
              <SelectContent>
                {["Wedding","Pilgrimage","Corporate","School","Tour","Event"].map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div>
        <Label className="text-xs uppercase tracking-widest font-bold text-rk-muted">{t("special_req")}</Label>
        <Textarea
          rows={2}
          className="mt-1"
          value={form.special_requirements}
          onChange={(e) => update("special_requirements", e.target.value)}
          placeholder="Child seat, extra luggage, English-speaking driver, etc."
          data-testid="inq-special"
        />
      </div>

      <div className="grid sm:grid-cols-3 gap-4 pt-2 border-t border-rk-border">
        <div>
          <Label className="text-xs uppercase tracking-widest font-bold text-rk-muted">{t("name")}</Label>
          <Input className="h-12 mt-1" value={form.customer_name} onChange={(e) => update("customer_name", e.target.value)} data-testid="inq-name" />
        </div>
        <div>
          <Label className="text-xs uppercase tracking-widest font-bold text-rk-muted">{t("phone")}</Label>
          <Input className="h-12 mt-1" value={form.customer_phone} onChange={(e) => update("customer_phone", e.target.value)}
            required placeholder="+91 99999 99999" data-testid="inq-phone" />
        </div>
        <div>
          <Label className="text-xs uppercase tracking-widest font-bold text-rk-muted">{t("email")}</Label>
          <Input type="email" className="h-12 mt-1" value={form.customer_email} onChange={(e) => update("customer_email", e.target.value)} data-testid="inq-email" />
        </div>
      </div>

      {quote && (
        <div className="rounded-xl bg-rk-orange/5 border border-rk-orange/30 p-4 flex items-center gap-3" data-testid="live-quote">
          <Sparkles className="text-rk-orange shrink-0" size={20} />
          <div className="flex-1">
            <div className="text-xs uppercase font-bold tracking-widest text-rk-orange flex items-center gap-2">
              {t("estimated")}
              {quote.distance_source === "osrm" && (
                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[9px]" data-testid="osrm-badge">REAL ROAD DISTANCE</span>
              )}
            </div>
            <div className="font-heading text-xl font-extrabold text-rk-navy">
              ₹{quote.quote_min?.toLocaleString()} – ₹{quote.quote_max?.toLocaleString()}
              <span className="text-rk-muted text-xs font-normal ml-2">≈ {quote.distance_km} km</span>
            </div>
          </div>
        </div>
      )}

      <Button
        type="submit"
        disabled={submitting}
        className="w-full h-14 bg-rk-orange hover:bg-rk-orange-600 text-white font-bold rounded-full text-base"
        data-testid="inquiry-submit"
      >
        {submitting ? <><Loader2 size={16} className="animate-spin mr-2" /> {t("submitting")}</> : t("submit")}
      </Button>
    </form>
  );
}

function LeadBadge({ score }) {
  const map = {
    hot:  { bg: "#FF7A00", label: "HOT 🔥" },
    warm: { bg: "#F59E0B", label: "WARM" },
    cold: { bg: "#3B82F6", label: "COLD" },
  };
  const cfg = map[score] || map.warm;
  return (
    <div className="font-heading font-extrabold text-2xl mt-1" style={{ color: cfg.bg }} data-testid={`lead-badge-${score}`}>
      {cfg.label}
    </div>
  );
}
