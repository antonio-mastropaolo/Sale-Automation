"use client";

import { useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, Loader2, Pause, AlertTriangle, GripVertical, Octagon, Play } from "lucide-react";
import type { StageStatus } from "./use-pipeline-reducer";

interface PipelineNodeProps {
  index: number;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  status: StageStatus;
  isAI: boolean;
  hasBreakpoint: boolean;
  x: number;
  y: number;
  onDrag: (dx: number, dy: number) => void;
  onDragEnd: () => void;
  onToggleBreakpoint: () => void;
  onClick: () => void;
  isSelected: boolean;
}

export function PipelineNode({
  index, label, icon: Icon, color, status, isAI, hasBreakpoint,
  x, y, onDrag, onDragEnd, onToggleBreakpoint, onClick, isSelected,
}: PipelineNodeProps) {
  const dragRef = useRef<{ startX: number; startY: number; dragging: boolean }>({ startX: 0, startY: 0, dragging: false });

  const isRunning = status === "running";
  const isCompleted = status === "completed";
  const isPaused = status === "paused";
  const isError = status === "error";

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { startX: e.clientX, startY: e.clientY, dragging: true };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.dragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    dragRef.current.startX = e.clientX;
    dragRef.current.startY = e.clientY;
    onDrag(dx, dy);
  }, [onDrag]);

  const handlePointerUp = useCallback(() => {
    if (dragRef.current.dragging) {
      dragRef.current.dragging = false;
      onDragEnd();
    }
  }, [onDragEnd]);

  return (
    <div
      className="absolute select-none touch-none"
      style={{
        left: x, top: y, zIndex: isSelected ? 50 : 10,
        animation: `nodeEntrance 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.06}s both`,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div
        className={cn(
          "relative rounded-2xl border bg-card cursor-grab active:cursor-grabbing shadow-lg",
          "w-[220px] transition-all duration-300",
          isRunning && "animate-glow-pulse",
          isCompleted && "animate-[completePop_0.3s_ease-out]",
          isSelected && "ring-2 ring-[var(--primary)]",
          isRunning && "ring-2",
          isPaused && "ring-2 ring-amber-500/60",
          isError && "ring-2 ring-red-500/40",
          isCompleted && "border-emerald-500/30",
          !isRunning && !isPaused && !isError && !isCompleted && !isSelected && "border-[var(--border)] hover:shadow-xl",
        )}
        style={{
          boxShadow: isRunning ? `0 0 28px ${color}25, 0 4px 16px rgba(0,0,0,0.2)` : isPaused ? `0 0 28px rgba(245,158,11,0.2)` : undefined,
          ...(isRunning ? { borderColor: `${color}60` } : {}),
        }}
      >
        {/* Running progress bar */}
        {isRunning && (
          <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl overflow-hidden">
            <div className="h-full rounded-full" style={{ background: color, animation: "progress-fill 2s ease-in-out infinite" }} />
          </div>
        )}

        {/* Paused banner */}
        {isPaused && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-amber-500 text-[9px] font-bold text-white tracking-wider z-20 shadow-lg shadow-amber-500/30 flex items-center gap-1">
            <Pause className="h-2.5 w-2.5" /> PAUSED
          </div>
        )}

        {/* Breakpoint indicator — red dot on top-right */}
        {hasBreakpoint && !isPaused && (
          <div className="absolute -top-1 -right-1 z-20">
            <div className="h-4 w-4 rounded-full bg-red-500 border-2 border-card flex items-center justify-center shadow-lg shadow-red-500/30">
              <Octagon className="h-2 w-2 text-white" />
            </div>
          </div>
        )}

        <div className="p-4">
          {/* Top: grip + step badge + icon + label */}
          <div className="flex items-center gap-2.5">
            <GripVertical className="h-4 w-4 text-muted-foreground/20 shrink-0 cursor-grab" />

            {/* Step badge */}
            <span
              className="h-6 w-6 rounded-full text-[10px] font-bold flex items-center justify-center text-white shrink-0"
              style={{ background: isCompleted ? "#10b981" : isError ? "#ef4444" : color, boxShadow: `0 0 10px ${isCompleted ? "#10b98140" : color + "40"}` }}
            >
              {isCompleted ? "✓" : index + 1}
            </span>

            {/* Icon */}
            <div
              className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-transform", isRunning && "scale-110")}
              style={{ backgroundColor: `${color}12`, color }}
            >
              {isRunning ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isCompleted ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : isError ? (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              ) : (
                <Icon className="h-5 w-5" />
              )}
            </div>

            {/* Label + badges */}
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold truncate leading-tight">{label}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded", isAI ? "bg-violet-500/10 text-violet-500" : "bg-blue-500/10 text-blue-500")}>
                  {isAI ? "AI" : "AUTO"}
                </span>
                {status !== "idle" && (
                  <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded uppercase",
                    isRunning && "bg-blue-500/10 text-blue-500",
                    isCompleted && "bg-emerald-500/10 text-emerald-500",
                    isPaused && "bg-amber-500/10 text-amber-500",
                    isError && "bg-red-500/10 text-red-500",
                    status === "pending" && "bg-muted text-muted-foreground",
                  )}>{status}</span>
                )}
              </div>
            </div>
          </div>

          {/* Bottom: breakpoint toggle + configure */}
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[var(--border)]">
            <button
              onClick={(e) => { e.stopPropagation(); onToggleBreakpoint(); }}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold transition-all",
                hasBreakpoint
                  ? "bg-red-500/15 text-red-500 hover:bg-red-500/25 ring-1 ring-red-500/20"
                  : "text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted"
              )}
            >
              {hasBreakpoint ? (
                <><Octagon className="h-3 w-3 fill-red-500" /> Breakpoint ON</>
              ) : (
                <><Octagon className="h-3 w-3" /> Set Breakpoint</>
              )}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onClick(); }}
              className="text-[10px] font-semibold text-[var(--primary)] hover:text-[var(--primary)]/80 transition-colors px-2 py-1 rounded-md hover:bg-[var(--primary)]/10"
            >
              Configure
            </button>
          </div>
        </div>

        {/* Connection anchor points */}
        <div className="absolute left-1/2 -bottom-1.5 w-3 h-3 -translate-x-1/2">
          <div className="w-3 h-3 rounded-full border-2 border-[var(--border)] bg-card" />
        </div>
        <div className="absolute left-1/2 -top-1.5 w-3 h-3 -translate-x-1/2">
          <div className="w-3 h-3 rounded-full border-2 border-[var(--border)] bg-card" />
        </div>
      </div>
    </div>
  );
}
