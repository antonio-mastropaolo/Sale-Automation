"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2, Send, Check, X } from "lucide-react";
import {
  platformBranding as platformBrandingColors,
  publishStatusColor,
} from "@/lib/colors";

interface PlatformPreviewProps {
  platform: string;
  title: string;
  description: string;
  hashtags: string[];
  suggestedPrice: number | null;
  status: string;
  platformUrl: string | null;
  onPublish?: () => void;
  publishing?: boolean;
}

const statusIcon: Record<string, React.ReactNode> = {
  draft: null,
  published: <Check className="h-3 w-3" />,
  failed: <X className="h-3 w-3" />,
};

export function PlatformPreview({
  platform,
  title,
  description,
  hashtags,
  suggestedPrice,
  status,
  platformUrl,
  onPublish,
  publishing,
}: PlatformPreviewProps) {
  const brand = platformBrandingColors[platform] || platformBrandingColors.depop;

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-all overflow-hidden">
      <CardHeader className="pb-3 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg ${brand.bg} ${brand.color} flex items-center justify-center font-bold text-sm`}>
              {brand.icon}
            </div>
            <div>
              <p className={`font-semibold text-sm ${brand.color}`}>
                {platform.charAt(0).toUpperCase() + platform.slice(1)}
              </p>
              {suggestedPrice !== null && (
                <p className="text-xs text-muted-foreground">
                  ${suggestedPrice.toFixed(2)}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-xs ${publishStatusColor[status] || ""}`}>
              {statusIcon[status]}
              {status === "published" ? "Live" : status}
            </Badge>
            {platformUrl && (
              <a
                href={platformUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="bg-muted/30 rounded-lg p-3">
          <p className="font-medium text-sm leading-tight">{title}</p>
          <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap line-clamp-4 leading-relaxed">
            {description}
          </p>
        </div>
        {hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {hashtags.map((tag) => (
              <span
                key={tag}
                className={`text-xs px-2 py-0.5 rounded-full ${brand.bg} ${brand.color}`}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
        {status !== "published" && onPublish && (
          <Button
            size="sm"
            onClick={onPublish}
            disabled={publishing}
            className="w-full"
            variant="outline"
          >
            {publishing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Publish to {platform.charAt(0).toUpperCase() + platform.slice(1)}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
