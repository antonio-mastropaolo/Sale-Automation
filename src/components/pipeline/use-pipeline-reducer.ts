import { useReducer } from "react";

export type StageStatus = "idle" | "pending" | "running" | "paused" | "completed" | "error";
export type PipelineMode = "demo" | "live";

export interface PipelineState {
  runId: string | null;
  stages: Record<string, StageStatus>;
  breakpoints: Set<string>;
  interceptedData: Record<string, string>;
  speed: 1 | 2 | 3;
  activeStageIndex: number;
  mode: PipelineMode;
}

export type PipelineAction =
  | { type: "RUN_PIPELINE"; stageIds: string[] }
  | { type: "STAGE_START"; stageId: string; index: number }
  | { type: "STAGE_COMPLETE"; stageId: string }
  | { type: "STAGE_ERROR"; stageId: string }
  | { type: "STAGE_PAUSE"; stageId: string; data: string }
  | { type: "STAGE_RESUME"; stageId: string }
  | { type: "SET_BREAKPOINT"; stageId: string }
  | { type: "SET_INTERCEPTED_DATA"; stageId: string; data: string }
  | { type: "SET_SPEED"; speed: 1 | 2 | 3 }
  | { type: "SET_MODE"; mode: PipelineMode }
  | { type: "RESET"; stageIds: string[] };

function pipelineReducer(state: PipelineState, action: PipelineAction): PipelineState {
  switch (action.type) {
    case "RUN_PIPELINE": {
      const stages: Record<string, StageStatus> = {};
      action.stageIds.forEach((id) => { stages[id] = "pending"; });
      return { ...state, runId: crypto.randomUUID(), stages, activeStageIndex: 0, interceptedData: {} };
    }
    case "STAGE_START":
      return { ...state, stages: { ...state.stages, [action.stageId]: "running" }, activeStageIndex: action.index };
    case "STAGE_COMPLETE":
      return { ...state, stages: { ...state.stages, [action.stageId]: "completed" } };
    case "STAGE_ERROR":
      return { ...state, stages: { ...state.stages, [action.stageId]: "error" }, runId: null };
    case "STAGE_PAUSE":
      return { ...state, stages: { ...state.stages, [action.stageId]: "paused" }, interceptedData: { ...state.interceptedData, [action.stageId]: action.data } };
    case "STAGE_RESUME":
      return { ...state, stages: { ...state.stages, [action.stageId]: "running" } };
    case "SET_BREAKPOINT": {
      const bp = new Set(state.breakpoints);
      if (bp.has(action.stageId)) bp.delete(action.stageId); else bp.add(action.stageId);
      return { ...state, breakpoints: bp };
    }
    case "SET_INTERCEPTED_DATA":
      return { ...state, interceptedData: { ...state.interceptedData, [action.stageId]: action.data } };
    case "SET_SPEED":
      return { ...state, speed: action.speed };
    case "SET_MODE":
      return { ...state, mode: action.mode };
    case "RESET": {
      const stages: Record<string, StageStatus> = {};
      action.stageIds.forEach((id) => { stages[id] = "idle"; });
      return { ...state, runId: null, stages, activeStageIndex: 0, interceptedData: {} };
    }
    default:
      return state;
  }
}

export function usePipelineReducer(stageIds: string[]) {
  const initialStages: Record<string, StageStatus> = {};
  stageIds.forEach((id) => { initialStages[id] = "idle"; });

  return useReducer(pipelineReducer, {
    runId: null,
    stages: initialStages,
    breakpoints: new Set<string>(),
    interceptedData: {},
    speed: 1,
    activeStageIndex: 0,
    mode: "demo" as PipelineMode,
  });
}
