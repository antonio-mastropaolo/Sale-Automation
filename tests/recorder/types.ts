/* ------------------------------------------------------------------ */
/*  Shared types for the visual test recorder/replayer                  */
/* ------------------------------------------------------------------ */

export type ActionType =
  | "click"
  | "dblclick"
  | "fill"
  | "type"
  | "press"
  | "goto"
  | "hover"
  | "check"
  | "uncheck"
  | "select"
  | "scroll"
  | "wait";

export interface RecordedAction {
  /** Sequential index */
  step: number;
  /** Action type */
  action: ActionType;
  /** CSS / Playwright selector for the target element */
  selector?: string;
  /** Value for fill/type/select/press actions */
  value?: string;
  /** URL for goto actions */
  url?: string;
  /** Scroll delta */
  scrollDelta?: { x: number; y: number };
  /** Coordinates of the action (viewport-relative) */
  coords?: { x: number; y: number };
  /** Timestamp (ms since recording start) */
  timestamp: number;
  /** Human-readable description */
  label?: string;
}

export interface Recording {
  /** When the recording was created */
  createdAt: string;
  /** Base URL of the app */
  baseURL: string;
  /** Viewport size during recording */
  viewport: { width: number; height: number };
  /** All recorded actions */
  actions: RecordedAction[];
}

export interface VisualHarnessOptions {
  /** Delay in ms after visual indicator, before action executes (default: 250) */
  actionDelay: number;
  /** Show animated cursor (default: true) */
  showCursor: boolean;
  /** Highlight target elements (default: true) */
  showHighlights: boolean;
  /** Show action label overlay (default: true) */
  showActionLabel: boolean;
  /** Show step counter (default: true) */
  showStepCounter: boolean;
  /** Show scrolling action log (default: true) */
  showActionLog: boolean;
  /** Max entries in the action log (default: 8) */
  actionLogMax: number;
}

export interface ReplayOptions {
  /** Speed multiplier: 1 = real-time, 2 = 2x, 0.5 = half speed */
  speed: number;
  /** Whether to pause between actions or use recorded timing */
  useRecordedTiming: boolean;
  /** Fixed delay between actions when useRecordedTiming is false (ms) */
  fixedDelay: number;
}
