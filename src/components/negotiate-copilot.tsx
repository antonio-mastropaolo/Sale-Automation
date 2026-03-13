"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  MessageSquare,
  Shield,
  Handshake,
  Check,
  Copy,
  User,
  Bot,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { responseStyles } from "@/lib/colors";

interface NegotiationData {
  buyerAnalysis: {
    intent: string;
    estimatedMaxPrice: number;
    seriousnessScore: number;
  };
  responses: { type: string; message: string; strategy: string }[];
  recommendedResponse: string;
  tactic: string;
}

const responseIcons: Record<string, React.ElementType> = {
  firm: Shield,
  negotiate: Handshake,
  accept: Check,
};

const responseColors = responseStyles;

interface NegotiateCopilotProps {
  itemTitle: string;
  itemPrice: number;
  itemDescription: string;
}

export function NegotiateCopilot({ itemTitle, itemPrice, itemDescription }: NegotiateCopilotProps) {
  const [buyerMessage, setBuyerMessage] = useState("");
  const [minimumPrice, setMinimumPrice] = useState("");
  const [data, setData] = useState<NegotiationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const analyze = async () => {
    if (!buyerMessage.trim()) {
      toast.error("Paste the buyer's message first");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/ai/negotiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "draft_response",
          itemTitle,
          itemPrice,
          itemDescription,
          buyerMessage,
          minimumPrice: minimumPrice ? parseFloat(minimumPrice) : undefined,
          sellerStyle: "friendly and professional",
        }),
      });
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      toast.error("Failed to generate responses");
    }
    setLoading(false);
  };

  const copyResponse = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
    toast.success("Copied to clipboard");
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          Negotiation Copilot
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-sm">Buyer&apos;s message</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Textarea
                placeholder="Paste the buyer's message here, e.g. Would you take $30?"
                value={buyerMessage}
                onChange={(e) => setBuyerMessage(e.target.value)}
                className="pl-9 min-h-[80px]"
              />
            </div>
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-2">
              <Label className="text-sm">Minimum you&apos;d accept (optional)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input
                  type="number"
                  placeholder="0"
                  value={minimumPrice}
                  onChange={(e) => setMinimumPrice(e.target.value)}
                  className="pl-7"
                />
              </div>
            </div>
            <Button onClick={analyze} disabled={loading} className="h-10">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Analyze
            </Button>
          </div>
        </div>

        {data && (
          <div className="space-y-4 pt-2">
            {/* Buyer analysis */}
            <div className="p-3 rounded-xl bg-muted/30">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Buyer Analysis</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  Intent: {data.buyerAnalysis.intent}
                </Badge>
                <Badge variant="outline">
                  Max price: ~${data.buyerAnalysis.estimatedMaxPrice}
                </Badge>
                <Badge variant="outline">
                  Seriousness: {data.buyerAnalysis.seriousnessScore}/10
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">{data.tactic}</p>
            </div>

            {/* Response options */}
            <div className="space-y-2">
              {data.responses.map((resp, i) => {
                const Icon = responseIcons[resp.type] || MessageSquare;
                const isRecommended = resp.type === data.recommendedResponse;
                return (
                  <div
                    key={i}
                    className={`p-3 rounded-xl border transition-all ${
                      isRecommended
                        ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                        : "border-border bg-background"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={responseColors[resp.type] || ""}>
                          <Icon className="h-3 w-3 mr-1" />
                          {resp.type.charAt(0).toUpperCase() + resp.type.slice(1)}
                        </Badge>
                        {isRecommended && (
                          <Badge className="bg-primary text-primary-foreground border-0 text-xs">
                            Recommended
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyResponse(resp.message, i)}
                      >
                        {copiedIndex === i ? (
                          <Check className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                    <div className="flex gap-2 mb-2">
                      <Bot className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <p className="text-sm">{resp.message}</p>
                    </div>
                    <p className="text-xs text-muted-foreground italic">{resp.strategy}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
