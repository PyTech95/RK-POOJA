import { useState, useRef, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Send, Sparkles, Loader2 } from "lucide-react";
import { api } from "../lib/api";
import { useLang } from "../lib/language-context";

function sessionId() {
  let id = localStorage.getItem("rk_chat_session");
  if (!id) {
    id = "sess_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("rk_chat_session", id);
  }
  return id;
}

const SUGGESTIONS = [
  "Need a sedan from Patna to Gaya tomorrow",
  "We are 40 people going to Varanasi",
  "Tempo traveller for 3 days, family trip",
  "Same day medicine delivery in Mumbai",
];

export function AIChat({ open, onOpenChange }) {
  const { lang } = useLang();
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I'm RK POOJA's AI assistant. Tell me where you want to go — I'll find the right ride and price.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: msg }]);
    setLoading(true);
    try {
      const { data } = await api.post("/ai/chat", {
        session_id: sessionId(),
        message: msg,
        language: lang,
      });
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: "Sorry — couldn't connect. Try WhatsApp from the floating button." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0" data-testid="ai-chat-sheet">
        <SheetHeader className="px-5 py-4 border-b border-rk-border bg-rk-navy text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rk-orange grid place-items-center">
              <Sparkles size={18} />
            </div>
            <div>
              <SheetTitle className="text-white font-heading">AI Travel Assistant</SheetTitle>
              <p className="text-xs text-white/70">Multilingual · Powered by Claude</p>
            </div>
          </div>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3" data-testid="ai-chat-messages">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "ml-auto bg-rk-navy text-white rounded-br-sm"
                  : "bg-slate-100 text-rk-ink rounded-bl-sm"
              }`}
              data-testid={`chat-msg-${m.role}`}
            >
              {m.content}
            </div>
          ))}
          {loading && (
            <div className="bg-slate-100 text-rk-muted rounded-2xl rounded-bl-sm px-4 py-2.5 max-w-[60%] flex items-center gap-2 text-sm">
              <Loader2 size={14} className="animate-spin" /> Thinking…
            </div>
          )}
          {messages.length <= 1 && (
            <div className="pt-2 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => send(s)}
                  className="text-xs bg-white border border-rk-border rounded-full px-3 py-1.5 hover:border-rk-orange hover:text-rk-orange transition"
                  data-testid={`chat-suggestion-${i}`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); send(); }}
          className="border-t border-rk-border p-3 flex items-center gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about your trip…"
            className="flex-1"
            data-testid="ai-chat-input"
          />
          <Button
            type="submit"
            size="icon"
            className="bg-rk-orange hover:bg-rk-orange-600 text-white"
            disabled={loading || !input.trim()}
            data-testid="ai-chat-send"
          >
            <Send size={16} />
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
