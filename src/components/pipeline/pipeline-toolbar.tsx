"use client";

import { Button } from "@/components/ui/button";
import { Play, Square, RotateCcw, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PipelineMode, PipelineState } from "./use-pipeline-reducer";

interface PipelineToolbarProps {
  state: PipelineState;
  totalStages: number;
  onRun: () => void;
  onStop: () => void;
  onReset: () => void;
  onSpeedChange: (speed: 1 | 2 | 3) => void;
  onModeChange: (mode: PipelineMode) => void;
}

export function PipelineToolbar({ state, totalStages, onRun, onStop, onReset, onSpeedChange, onModeChange }: PipelineToolbarProps) {
  const isRunning = state.runId !== null;
  const completedCount = Object.values(state.stages).filter((s) => s === "completed").length;
  const pausedStage = Object.entries(state.stages).find(([, s]) => s === "paused");
  const errorStage = Object.entries(state.stages).find(([, s]) => s === "error");
  const breakpointCount = state.breakpoints.size;

  const statusText = errorStage
    ? `Error at stage ${Object.keys(state.stages).indexOf(errorStage[0]) + 1}`
    : pausedStage
      ? `Paused at stage ${Object.keys(state.stages).indexOf(pausedStage[0]) + 1}`
      : isRunning
        ? `Running (${completedCount}/${totalStages})`
        : completedCount === totalStages && completedCount > 0
          ? "Completed"
          : "Ready";

  const statusColor = errorStage
    ? "text-red-500"
    : pausedStage
      ? "text-amber-500"
      : isRunning
        ? "text-blue-500"
        : completedCount === totalStages && completedCount > 0
          ? "text-emerald-500"
          : "text-muted-foreground";

  return (
    <div className="sticky top-0 z-20 rounded-xl bg-[var(--card)]/80 backdrop-blur-sm border border-[var(--border)] px-4 py-2.5 flex flex-wrap items-center gap-3">
      {/* Run / Stop */}
      {isRunning ? (
        <Button variant="destructive" size="sm" className="h-8 text-xs gap-1.5" onClick={onStop}>
          <Square className="h-3 w-3" />
          Stop
        </Button>
      ) : (
        <Button size="sm" className="h-8 text-xs gap-1.5" onClick={onRun}>
          <Play className="h-3 w-3" />
          Run Pipeline
        </Button>
      )}

      {/* Reset */}
      <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={onReset} disabled={!isRunning && completedCount === 0}>
        <RotateCcw className="h-3 w-3" />
        Reset
      </Button>

      {/* Separator */}
      <div className="h-5 w-px bg-[var(--border)]" />

      {/* Speed control */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-muted-foreground font-medium">Speed</span>
        <div className="flex gap-0.5">
          {([1, 2, 3] as const).map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className={cn(
                "h-6 w-6 rounded-md text-[10px] font-bold transition-colors",
                state.speed === s
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Separator */}
      <div className="h-5 w-px bg-[var(--border)]" />

      {/* Mode toggle */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-muted-foreground font-medium">Mode</span>
        {(["demo", "live"] as const).map((m) => (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            className={cn(
              "px-2 py-1 rounded-md text-[10px] font-medium capitalize transition-colors",
              state.mode === m
                ? m === "live" ? "bg-red-500/10 text-red-500" : "bg-[var(--primary)] text-[var(--primary-foreground)]"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Breakpoints count */}
      {breakpointCount > 0 && (
        <>
          <div className="h-5 w-px bg-[var(--border)]" />
          <div className="flex items-center gap-1.5 text-[10px]">
            <Circle className="h-2.5 w-2.5 fill-red-500 text-red-500" />
            <span className="text-red-500 font-medium">{breakpointCount} breakpoint{breakpointCount > 1 ? "s" : ""}</span>
          </div>
        </>
      )}

      {/* Status — pushed to right */}
      <div className="ml-auto flex items-center gap-1.5">
        {isRunning && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
          </span>
        )}
        <span className={cn("text-[11px] font-semibold", statusColor)}>{statusText}</span>
      </div>
    </div>
  );
}
