"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageCircle,
  Send,
  Search,
  ArrowLeft,
  Sparkles,
  Loader2,
  Archive,
  CheckCheck,
  Clock,
  User,
  Package,
  Filter,
  Plus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { platformBranding } from "@/lib/colors";

// ── Types ───────────────────────────────────────────────────────

interface Message {
  id: string;
  sender: string;
  content: string;
  platform: string;
  read: boolean;
  createdAt: string;
}

interface Conversation {
  id: string;
  platform: string;
  buyerName: string;
  buyerUsername: string;
  listingTitle: string;
  status: string;
  lastMessage: string;
  lastMessageAt: string;
  unread: boolean;
  messages: Message[];
}

// ── Helpers ─────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

const PLATFORMS = ["all", "depop", "grailed", "poshmark", "mercari", "ebay", "vinted", "facebook", "vestiaire"];

// ═══════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════

export default function InboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Fetch conversations ──────────────────────────────────

  const fetchConversations = useCallback(async () => {
    try {
      const params = platformFilter !== "all" ? `?platform=${platformFilter}` : "";
      const res = await fetch(`/api/inbox${params}`);
      const data = await res.json();
      setConversations(data.conversations || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // silent
    }
    setLoading(false);
  }, [platformFilter]);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, [fetchConversations]);

  // ── Select conversation ──────────────────────────────────

  const openConversation = async (conv: Conversation) => {
    try {
      const res = await fetch(`/api/inbox/${conv.id}`);
      const data = await res.json();
      setSelected(data);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch {
      toast.error("Failed to load conversation");
    }
  };

  // ── Send reply ───────────────────────────────────────────

  const sendReply = async () => {
    if (!reply.trim() || !selected) return;
    setSending(true);
    try {
      const res = await fetch(`/api/inbox/${selected.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: reply.trim(), sender: "seller" }),
      });
      if (!res.ok) throw new Error();
      const msg = await res.json();
      setSelected((prev) =>
        prev ? { ...prev, messages: [...prev.messages, msg], lastMessage: reply.trim() } : prev
      );
      setReply("");
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      fetchConversations();
    } catch {
      toast.error("Failed to send");
    }
    setSending(false);
  };

  // ── AI suggest ───────────────────────────────────────────

  const suggestReply = async () => {
    if (!selected || selected.messages.length === 0) return;
    setSuggesting(true);
    try {
      const lastBuyerMsg = [...selected.messages].reverse().find((m) => m.sender === "buyer");
      if (!lastBuyerMsg) { setSuggesting(false); return; }

      const res = await fetch("/api/inbox/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyerMessage: lastBuyerMsg.content,
          platform: selected.platform,
          listingTitle: selected.listingTitle,
        }),
      });
      const data = await res.json();
      // Show suggestions as a picker
      const options = [data.friendly, data.professional, data.brief].filter(Boolean);
      if (options.length > 0) {
        setSuggestions(options);
      }
    } catch {
      toast.error("AI suggestion failed");
    }
    setSuggesting(false);
  };

  const [suggestions, setSuggestions] = useState<string[]>([]);

  // ── Archive ──────────────────────────────────────────────

  const archiveConversation = async () => {
    if (!selected) return;
    await fetch(`/api/inbox/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "archived" }),
    });
    setSelected(null);
    fetchConversations();
    toast.success("Conversation archived");
  };

  // ── Filter ───────────────────────────────────────────────

  const filtered = conversations.filter((c) => {
    if (search) {
      const q = search.toLowerCase();
      return c.buyerName.toLowerCase().includes(q) || c.lastMessage.toLowerCase().includes(q) || c.listingTitle.toLowerCase().includes(q);
    }
    return true;
  });

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="animate-fade-in" style={{ height: "calc(100vh - 80px)" }}>
      <div className="flex h-full rounded-xl bg-card overflow-hidden">

        {/* ── Left: Conversation List ──────────────────────── */}
        <div className={`${selected ? "hidden md:flex" : "flex"} flex-col w-full md:w-80 lg:w-96 border-r border-border shrink-0`}>
          {/* Header */}
          <div className="p-3 border-b border-border space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" style={{ color: "var(--primary)" }} />
                <h1 className="text-base font-semibold">Inbox</h1>
                {unreadCount > 0 && (
                  <Badge className="bg-[var(--primary)] text-[var(--primary-foreground)] text-[10px] px-1.5 h-5">
                    {unreadCount}
                  </Badge>
                )}
              </div>
            </div>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
              <Input
                placeholder="Search conversations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-[13px] rounded-lg"
              />
            </div>
            {/* Platform filter — horizontal scroll */}
            <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
              {PLATFORMS.map((p) => {
                const branding = platformBranding[p];
                return (
                  <button
                    key={p}
                    onClick={() => setPlatformFilter(p)}
                    className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                      platformFilter === p
                        ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {p === "all" ? "All" : branding?.label || p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading...
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <MessageCircle className="h-8 w-8 text-muted-foreground/20 mb-3" />
                <p className="text-sm font-medium mb-1">No conversations yet</p>
                <p className="text-xs text-muted-foreground">
                  Messages from buyers across all platforms will appear here
                </p>
              </div>
            ) : (
              filtered.map((conv) => {
                const branding = platformBranding[conv.platform];
                const isSelected = selected?.id === conv.id;
                return (
                  <button
                    key={conv.id}
                    onClick={() => openConversation(conv)}
                    className={`w-full text-left p-3 border-b border-border/50 hover:bg-muted/30 transition-colors ${
                      isSelected ? "bg-[var(--accent)]" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div
                        className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                        style={{ backgroundColor: branding?.accent?.replace("bg-", "") || "var(--primary)" }}
                      >
                        {conv.buyerName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[13px] truncate ${conv.unread ? "font-semibold" : "font-medium"}`}>
                            {conv.buyerName}
                          </span>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {timeAgo(conv.lastMessageAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge
                            variant="outline"
                            className={`text-[9px] px-1 py-0 shrink-0 ${branding?.color || ""} ${branding?.bg || ""}`}
                          >
                            {branding?.label || conv.platform}
                          </Badge>
                          {conv.listingTitle && (
                            <span className="text-[10px] text-muted-foreground truncate">
                              {conv.listingTitle}
                            </span>
                          )}
                        </div>
                        <p className={`text-xs mt-1 truncate ${conv.unread ? "text-foreground" : "text-muted-foreground"}`}>
                          {conv.lastMessage}
                        </p>
                      </div>
                      {conv.unread && (
                        <div className="h-2.5 w-2.5 rounded-full shrink-0 mt-1" style={{ background: "var(--primary)" }} />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right: Message Thread ────────────────────────── */}
        <div className={`${selected ? "flex" : "hidden md:flex"} flex-col flex-1`}>
          {selected ? (
            <>
              {/* Thread header */}
              <div className="p-3 border-b border-border flex items-center gap-3">
                <button onClick={() => setSelected(null)} className="md:hidden p-1.5 rounded-lg hover:bg-muted">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{selected.buyerName}</span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1.5 py-0 ${platformBranding[selected.platform]?.color || ""} ${platformBranding[selected.platform]?.bg || ""}`}
                    >
                      {platformBranding[selected.platform]?.label || selected.platform}
                    </Badge>
                  </div>
                  {selected.listingTitle && (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Package className="h-3 w-3" />
                      {selected.listingTitle}
                    </p>
                  )}
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={archiveConversation}>
                  <Archive className="h-3 w-3" /> Archive
                </Button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {selected.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === "seller" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                        msg.sender === "seller"
                          ? "bg-[var(--primary)] text-[var(--primary-foreground)] rounded-br-md"
                          : "bg-muted text-foreground rounded-bl-md"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      <div className={`flex items-center gap-1 mt-1 text-[10px] ${
                        msg.sender === "seller" ? "text-white/60 justify-end" : "text-muted-foreground"
                      }`}>
                        <Clock className="h-2.5 w-2.5" />
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {msg.sender === "seller" && <CheckCheck className="h-3 w-3 ml-0.5" />}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* AI suggestions */}
              {suggestions.length > 0 && (
                <div className="px-3 pb-2">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Sparkles className="h-3 w-3" style={{ color: "var(--primary)" }} />
                    <span className="text-[11px] font-medium text-muted-foreground">AI Suggestions</span>
                    <button onClick={() => setSuggestions([])} className="ml-auto">
                      <X className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => { setReply(s); setSuggestions([]); }}
                        className="text-left text-xs px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors line-clamp-2"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Reply input */}
              <div className="p-3 border-t border-border">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 shrink-0 text-xs gap-1"
                    onClick={suggestReply}
                    disabled={suggesting}
                  >
                    {suggesting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    AI
                  </Button>
                  <Textarea
                    placeholder="Type a reply..."
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); }
                    }}
                    rows={1}
                    className="min-h-[36px] max-h-[120px] text-[13px] resize-none"
                  />
                  <Button
                    size="sm"
                    className="h-9 shrink-0"
                    onClick={sendReply}
                    disabled={!reply.trim() || sending}
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
              <div className="h-16 w-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "var(--accent)" }}>
                <MessageCircle className="h-8 w-8" style={{ color: "var(--primary)" }} />
              </div>
              <h2 className="text-lg font-semibold mb-1">Unified Inbox</h2>
              <p className="text-sm text-muted-foreground max-w-sm mb-4">
                All your buyer conversations from Depop, Grailed, Poshmark, Mercari, eBay, Vinted, Facebook, and Vestiaire — in one place.
              </p>
              <p className="text-xs text-muted-foreground">
                Select a conversation to start replying, or messages will appear here as buyers reach out across your platforms.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
