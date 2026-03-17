"use client";

import { Button } from "@/components/ui/button";
import { Play, X, Copy, Check } from "lucide-react";
import { useState } from "react";

interface DataInspectorProps {
  stageLabel: string;
  stageColor: string;
  data: string;
  onDataChange: (data: string) => void;
  onContinue: () => void;
  onAbort: () => void;
}

export function DataInspector({ stageLabel, stageColor, data, onDataChange, onContinue, onAbort }: DataInspectorProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(data);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-card overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-amber-500/20 bg-amber-500/5">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-[12px] font-semibold text-amber-500">Data Inspector</span>
          <span className="text-[10px] text-muted-foreground">— paused at <span className="font-semibold" style={{ color: stageColor }}>{stageLabel}</span></span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleCopy} className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors" title="Copy">
            {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
          </button>
          <button onClick={onAbort} className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors" title="Abort">
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="p-4">
        <p className="text-[10px] text-muted-foreground mb-2">Edit the output data below. Changes will be passed to the next stage.</p>
        <textarea
          value={data}
          onChange={(e) => onDataChange(e.target.value)}
          className="w-full h-[180px] rounded-lg border border-border bg-background p-3 text-[11px] font-mono leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          spellCheck={false}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 pb-4">
        <Button size="sm" className="h-8 text-xs gap-1.5 bg-amber-500 hover:bg-amber-600 text-white" onClick={onContinue}>
          <Play className="h-3 w-3" />
          Continue Pipeline
        </Button>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onAbort}>
          Abort
        </Button>
      </div>
    </div>
  );
}
