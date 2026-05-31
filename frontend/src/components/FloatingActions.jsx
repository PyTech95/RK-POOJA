import { useState, useEffect } from "react";
import { Mic, MessageCircle, Phone, X } from "lucide-react";
import { AIChat } from "./AIChat";
import { VoiceBooking } from "./VoiceBooking";
import { api } from "../lib/api";

export function FloatingActions() {
  const [openChat, setOpenChat] = useState(false);
  const [openVoice, setOpenVoice] = useState(false);
  const [waNumber, setWaNumber] = useState("919999999999");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    api.get("/whatsapp/number").then((r) => setWaNumber(r.data.number)).catch(() => {});
  }, []);

  const whatsappUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(
    "Hello RK POOJA, I'd like to inquire about a ride."
  )}`;

  return (
    <>
      <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-3" data-testid="floating-actions">
        {expanded && (
          <div className="flex flex-col items-end gap-3 mb-1 animate-in fade-in slide-in-from-bottom-3">
            <FabButton
              label="Voice booking"
              onClick={() => { setOpenVoice(true); setExpanded(false); }}
              testId="fab-voice"
              bg="#0A2E6D"
            >
              <Mic size={18} />
            </FabButton>
            <FabButton
              label="AI chat"
              onClick={() => { setOpenChat(true); setExpanded(false); }}
              testId="fab-chat"
              bg="#0A2E6D"
            >
              <MessageCircle size={18} />
            </FabButton>
            <FabButton
              label="Call us"
              href="tel:+919999999999"
              testId="fab-call"
              bg="#0A2E6D"
            >
              <Phone size={18} />
            </FabButton>
          </div>
        )}

        {/* WhatsApp - always visible */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          data-testid="fab-whatsapp"
          className="relative w-14 h-14 rounded-full bg-[#25D366] text-white grid place-items-center shadow-2xl hover:scale-105 active:scale-95 transition"
          aria-label="WhatsApp"
        >
          <span className="absolute inset-0 rounded-full bg-[#25D366] animate-pulse-ring -z-10" />
          <svg viewBox="0 0 32 32" width="22" height="22" fill="currentColor">
            <path d="M19.11 17.27c-.32-.16-1.9-.94-2.19-1.05-.29-.11-.51-.16-.72.16-.21.32-.83 1.05-1.02 1.27-.19.21-.37.24-.69.08-.32-.16-1.34-.49-2.55-1.57-.94-.84-1.58-1.88-1.77-2.2-.19-.32-.02-.5.14-.66.14-.14.32-.37.48-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.72-1.74-.98-2.38-.26-.62-.53-.54-.72-.55h-.61c-.21 0-.56.08-.85.4-.29.32-1.12 1.1-1.12 2.68 0 1.58 1.15 3.1 1.31 3.31.16.21 2.27 3.47 5.5 4.86.77.33 1.37.53 1.84.68.77.25 1.47.21 2.02.13.62-.09 1.9-.78 2.17-1.53.27-.75.27-1.39.19-1.53-.08-.13-.29-.21-.61-.37zM16.03 4C9.93 4 5 8.93 5 15.03c0 1.95.51 3.86 1.48 5.54L5 27l6.59-1.73a10.99 10.99 0 0 0 4.44.95h.01c6.1 0 11.03-4.93 11.03-11.03S22.13 4 16.03 4z"/>
          </svg>
        </a>

        {/* AI Mic - always visible, second */}
        <button
          onClick={() => setOpenVoice(true)}
          data-testid="fab-voice-main"
          className="relative w-14 h-14 rounded-full bg-rk-orange text-white grid place-items-center shadow-2xl hover:scale-105 active:scale-95 transition"
          aria-label="Voice booking"
        >
          <span className="absolute inset-0 rounded-full bg-rk-orange animate-pulse-ring -z-10" />
          <Mic size={22} />
        </button>

        {/* AI Chat - main */}
        <button
          onClick={() => setOpenChat(true)}
          data-testid="fab-chat-main"
          className="w-14 h-14 rounded-full bg-rk-navy text-white grid place-items-center shadow-2xl hover:scale-105 active:scale-95 transition"
          aria-label="AI chat"
        >
          <MessageCircle size={22} />
        </button>

        {/* Expand toggle for "more" actions */}
        <button
          onClick={() => setExpanded((v) => !v)}
          data-testid="fab-more"
          className="w-10 h-10 rounded-full bg-white border border-rk-border text-rk-navy grid place-items-center shadow-lg text-xs font-bold hover:scale-105 transition"
          aria-label="More actions"
        >
          {expanded ? <X size={16} /> : "•••"}
        </button>
      </div>

      <AIChat open={openChat} onOpenChange={setOpenChat} />
      <VoiceBooking open={openVoice} onOpenChange={setOpenVoice} />
    </>
  );
}

function FabButton({ children, label, onClick, href, testId, bg }) {
  const inner = (
    <div className="flex items-center gap-2">
      <span className="hidden sm:inline bg-white text-rk-ink text-xs font-semibold px-3 py-1.5 rounded-full shadow">
        {label}
      </span>
      <span
        className="w-11 h-11 rounded-full text-white grid place-items-center shadow-xl hover:scale-105 transition"
        style={{ background: bg }}
      >
        {children}
      </span>
    </div>
  );
  if (href) {
    return (
      <a href={href} data-testid={testId} aria-label={label}>
        {inner}
      </a>
    );
  }
  return (
    <button onClick={onClick} data-testid={testId} aria-label={label}>
      {inner}
    </button>
  );
}
