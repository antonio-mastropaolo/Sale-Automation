"use client";

import { useState, useRef, useEffect } from "react";
import { useHelp, type HelpMode } from "./help-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  AlertCircle,
  HelpCircle,
  Mail,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const MODE_LABELS: Record<HelpMode, { label: string; icon: typeof MessageCircle }> = {
  ask: { label: "Ask", icon: HelpCircle },
  error: { label: "Errors", icon: AlertCircle },
  contact: { label: "Support", icon: Mail },
};

export function HelpAssistant() {
  const { isOpen, setIsOpen, errors, mode, setMode, hasUnreadErrors, clearErrors } = useHelp();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [contactSent, setContactSent] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "ask",
          question: text,
          history: messages.slice(-8),
        }),
      });
      const data = await res.json();
      if (data.reply) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: data.error || "Something went wrong." }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Failed to connect. Please try again." }]);
    }
    setLoading(false);
  };

  const explainError = async (errorMsg: string, details?: string) => {
    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", content: `Help me with this error: "${errorMsg}"` }]);

    try {
      const res = await fetch("/api/ai/help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "error",
          error: errorMsg,
          errorDetails: details,
          history: messages.slice(-6),
        }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply || data.error || "Could not analyze the error." }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Failed to connect. Please try again." }]);
    }
    setLoading(false);
  };

  const sendContactMessage = async () => {
    const text = input.trim();
    if (!text) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ai/help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "contact", message: text }),
      });
      const data = await res.json();
      if (data.success) {
        setContactSent(true);
        setInput("");
        setTimeout(() => setContactSent(false), 4000);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleModeChange = (m: HelpMode) => {
    setMode(m);
    if (m !== "ask") setMessages([]);
  };

  return (
    <>
      {/* ── Floating button ── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[60] h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center"
        >
          <Sparkles className="h-5 w-5" />
          {hasUnreadErrors && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 border-2 border-white animate-pulse" />
          )}
        </button>
      )}

      {/* ── Chat panel ── */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-[60] w-[380px] h-[520px] rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold flex-1">AI Assistant</span>
            <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Mode tabs */}
          <div className="flex gap-1 px-3 py-2 border-b border-border/50 shrink-0">
            {(Object.entries(MODE_LABELS) as [HelpMode, typeof MODE_LABELS["ask"]][]).map(([key, val]) => {
              const Icon = val.icon;
              return (
                <button
                  key={key}
                  onClick={() => handleModeChange(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    mode === key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {val.label}
                  {key === "error" && errors.length > 0 && (
                    <span className="ml-0.5 bg-red-500 text-white text-[9px] rounded-full h-4 w-4 flex items-center justify-center">
                      {errors.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Body */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
            {mode === "ask" && (
              <>
                {messages.length === 0 && (
                  <div className="text-center py-8 space-y-2">
                    <HelpCircle className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                    <p className="text-sm text-muted-foreground">Ask me anything about ListBlitz</p>
                    <div className="space-y-1">
                      {["How do I optimize a listing?", "What AI providers are supported?", "How does cross-publishing work?"].map((q) => (
                        <button
                          key={q}
                          onClick={() => { setInput(q); }}
                          className="block w-full text-left text-xs text-primary/70 hover:text-primary px-3 py-1.5 rounded-lg hover:bg-primary/5 transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-foreground"
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-muted/50 rounded-xl px-3 py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
              </>
            )}

            {mode === "error" && (
              <>
                {errors.length === 0 ? (
                  <div className="text-center py-8 space-y-2">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500/30 mx-auto" />
                    <p className="text-sm text-muted-foreground">No errors recorded</p>
                    <p className="text-xs text-muted-foreground/60">Errors will appear here when they occur.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-semibold text-muted-foreground">Recent Errors</p>
                      <button onClick={clearErrors} className="text-[10px] text-muted-foreground hover:text-foreground">
                        Clear all
                      </button>
                    </div>
                    {errors.slice().reverse().map((err, i) => (
                      <div key={i} className="rounded-lg bg-red-500/5 border border-red-500/10 p-2.5 space-y-1.5">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-red-700 dark:text-red-400 break-words">{err.message}</p>
                            {err.page && <p className="text-[10px] text-muted-foreground mt-0.5">Page: {err.page}</p>}
                          </div>
                        </div>
                        <button
                          onClick={() => explainError(err.message, err.details)}
                          disabled={loading}
                          className="w-full text-[11px] font-medium text-primary hover:underline text-left flex items-center gap-1"
                        >
                          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                          Explain &amp; fix this
                        </button>
                      </div>
                    ))}
                    {/* AI responses for errors */}
                    {messages.map((msg, i) => (
                      <div key={`err-${i}`} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                          msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/50 text-foreground"
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {loading && (
                      <div className="flex justify-start">
                        <div className="bg-muted/50 rounded-xl px-3 py-2">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {mode === "contact" && (
              <div className="space-y-3 py-2">
                <div className="text-center space-y-1">
                  <Mail className="h-6 w-6 text-muted-foreground/40 mx-auto" />
                  <p className="text-sm font-medium">Contact Support</p>
                  <p className="text-xs text-muted-foreground">Describe your issue and we&apos;ll get back to you.</p>
                </div>
                {contactSent && (
                  <div className="rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 p-3 text-xs flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    Message sent! We&apos;ll review it shortly.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input area */}
          {(mode === "ask" || mode === "contact") && (
            <div className="p-3 border-t border-border shrink-0">
              <div className="flex gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      mode === "contact" ? sendContactMessage() : sendMessage();
                    }
                  }}
                  placeholder={mode === "contact" ? "Describe your issue..." : "Ask a question..."}
                  className="min-h-[40px] max-h-[80px] text-xs resize-none"
                  rows={1}
                />
                <Button
                  size="sm"
                  className="h-10 w-10 shrink-0 p-0"
                  disabled={loading || !input.trim()}
                  onClick={() => mode === "contact" ? sendContactMessage() : sendMessage()}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
