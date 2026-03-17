"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2, Loader2, Pause, Circle, AlertTriangle, Zap, ChevronRight } from "lucide-react";
import type { StageStatus } from "./use-pipeline-reducer";

interface StageCardProps {
  index: number;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  status: StageStatus;
  isAI: boolean;
  hasBreakpoint: boolean;
  inputLabel: string;
  outputLabel: string;
  modelBadge: string;
  onToggleBreakpoint: () => void;
  onClick: () => void;
}

export function StageCard({
  index, label, description, icon: Icon, color, status,
  isAI, hasBreakpoint, inputLabel, outputLabel, modelBadge,
  onToggleBreakpoint, onClick,
}: StageCardProps) {

  const isRunning = status === "running";
  const isCompleted = status === "completed";
  const isPaused = status === "paused";
  const isError = status === "error";
  const isActive = isRunning || isPaused;

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative rounded-2xl border bg-card cursor-pointer transition-all duration-300 overflow-hidden group",
        isActive && "ring-2",
        isPaused && "ring-amber-500/60",
        isRunning && "ring-[var(--primary)]/40",
        isError && "ring-red-500/40",
        isCompleted && "border-emerald-500/20",
        !isActive && !isCompleted && !isError && "border-[var(--border)] hover:border-[var(--muted-foreground)]/20 hover:shadow-lg",
      )}
      style={{
        boxShadow: isRunning ? `0 0 24px ${color}20` : isPaused ? `0 0 24px rgba(245,158,11,0.15)` : undefined,
      }}
    >
      {/* Left accent bar */}
      <div
        className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl transition-all duration-500", isRunning && "animate-pulse-soft")}
        style={{
          backgroundColor: isPaused ? "#f59e0b" : isError ? "#ef4444" : isCompleted ? "#10b981" : color,
          opacity: isActive ? 0.9 : isCompleted ? 0.7 : 0.25,
        }}
      />

      {/* Progress bar (running state) */}
      {isRunning && (
        <div className="absolute top-0 left-0 right-0 h-0.5">
          <div className="h-full rounded-full" style={{ background: color, animation: "progress-fill 2s ease-in-out infinite" }} />
        </div>
      )}

      {/* Paused banner */}
      {isPaused && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center gap-2">
          <Pause className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-[11px] font-semibold text-amber-500">Breakpoint hit — inspect data below</span>
        </div>
      )}

      <div className="p-5 pl-6">
        {/* Header row */}
        <div className="flex items-start gap-3">
          {/* Step badge */}
          <div className="relative shrink-0">
            {isCompleted ? (
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              </div>
            ) : (
              <div
                className={cn("h-12 w-12 rounded-xl flex items-center justify-center transition-transform duration-300", isRunning && "scale-110")}
                style={{ backgroundColor: `${color}12`, color }}
              >
                {isRunning ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : isError ? (
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                ) : (
                  <Icon className="h-6 w-6" />
                )}
              </div>
            )}
            <span
              className="absolute -top-1.5 -left-1.5 h-5 w-5 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
              style={{ background: isCompleted ? "#10b981" : isError ? "#ef4444" : color }}
            >
              {isCompleted ? "✓" : index + 1}
            </span>
          </div>

          {/* Title + description */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-sm font-semibold">{label}</h3>
              <span className={cn(
                "text-[8px] font-bold px-1.5 py-0.5 rounded-full",
                isAI ? "text-violet-500 bg-violet-500/10" : "text-blue-500 bg-blue-500/10"
              )}>
                {isAI ? "AI" : "AUTO"}
              </span>
              {/* Status badge */}
              {status !== "idle" && (
                <span className={cn(
                  "text-[8px] font-bold px-1.5 py-0.5 rounded-full ml-auto",
                  isRunning && "bg-blue-500/10 text-blue-500",
                  isCompleted && "bg-emerald-500/10 text-emerald-500",
                  isPaused && "bg-amber-500/10 text-amber-500",
                  isError && "bg-red-500/10 text-red-500",
                  status === "pending" && "bg-muted text-muted-foreground",
                )}>
                  {status.toUpperCase()}
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{description}</p>
          </div>
        </div>

        {/* Input → Output flow */}
        <div className="mt-3 flex items-center gap-2 text-[10px]">
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/40">
            <Zap className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground font-medium">{inputLabel}</span>
          </div>
          <ChevronRight className="h-3 w-3 text-muted-foreground/30 shrink-0" />
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/40">
            <ChevronRight className="h-3 w-3" style={{ color }} />
            <span className="font-medium" style={{ color }}>{outputLabel}</span>
          </div>
        </div>

        {/* Bottom: model + breakpoint */}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{modelBadge}</span>

          <button
            onClick={(e) => { e.stopPropagation(); onToggleBreakpoint(); }}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-medium transition-colors",
              hasBreakpoint
                ? "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                : "text-muted-foreground/40 hover:bg-muted hover:text-muted-foreground"
            )}
            title={hasBreakpoint ? "Remove breakpoint" : "Set breakpoint — pause pipeline here"}
          >
            <Circle className={cn("h-2.5 w-2.5", hasBreakpoint && "fill-red-500")} />
            {hasBreakpoint ? "Breakpoint" : "Break"}
          </button>
        </div>
      </div>
    </div>
  );
}
