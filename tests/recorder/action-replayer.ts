/* ------------------------------------------------------------------ */
/*  Action Replayer                                                     */
/*  Loads a recorded session JSON and replays each action through       */
/*  the VisualHarness so every step is visible on screen / in video.    */
/* ------------------------------------------------------------------ */

import * as fs from "fs";
import * as path from "path";
import type { RecordedAction, Recording, ReplayOptions } from "./types";
import { VisualHarness } from "./visual-harness";

const RECORDINGS_DIR = path.join(__dirname, "recordings");

const DEFAULT_REPLAY: ReplayOptions = {
  speed: 1,
  useRecordedTiming: false,
  fixedDelay: 0, // harness actionDelay already provides a base delay
};

export class ActionReplayer {
  private recording: Recording | null = null;
  private opts: ReplayOptions;

  constructor(
    private harness: VisualHarness,
    options?: Partial<ReplayOptions>,
  ) {
    this.opts = { ...DEFAULT_REPLAY, ...options };
  }

  /* ── load recording ────────────────────────────────────── */

  async load(sessionPath: string): Promise<void> {
    // Resolve path: could be absolute, relative, or just a name
    let resolved = sessionPath;

    if (sessionPath === "latest") {
      resolved = this.findLatest();
    } else if (!path.isAbsolute(sessionPath)) {
      // Try in recordings dir first
      const inDir = path.join(RECORDINGS_DIR, sessionPath);
      if (fs.existsSync(inDir)) {
        resolved = inDir;
      } else if (!fs.existsSync(sessionPath)) {
        // Try adding .json
        const withExt = path.join(RECORDINGS_DIR, sessionPath + ".json");
        if (fs.existsSync(withExt)) resolved = withExt;
      }
    }

    if (!fs.existsSync(resolved)) {
      throw new Error(`Recording not found: ${sessionPath}`);
    }

    const raw = fs.readFileSync(resolved, "utf-8");
    this.recording = JSON.parse(raw);
    console.log(
      `  Loaded recording: ${path.basename(resolved)} (${this.recording!.actions.length} actions)`,
    );
  }

  loadFromData(recording: Recording): void {
    this.recording = recording;
  }

  /* ── find latest recording ─────────────────────────────── */

  private findLatest(): string {
    if (!fs.existsSync(RECORDINGS_DIR)) {
      throw new Error(`No recordings directory found at ${RECORDINGS_DIR}`);
    }
    const files = fs
      .readdirSync(RECORDINGS_DIR)
      .filter((f) => f.endsWith(".json"))
      .sort()
      .reverse();
    if (files.length === 0) {
      throw new Error("No recordings found");
    }
    return path.join(RECORDINGS_DIR, files[0]);
  }

  /* ── replay all actions ────────────────────────────────── */

  async play(): Promise<void> {
    if (!this.recording) throw new Error("No recording loaded");

    const { actions } = this.recording;
    this.harness.setTotalSteps(actions.length);

    console.log(`\n  Replaying ${actions.length} actions (speed: ${this.opts.speed}x)\n`);

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];

      // Inter-action delay
      if (i > 0 && this.opts.useRecordedTiming) {
        const gap = action.timestamp - actions[i - 1].timestamp;
        const scaledGap = Math.max(50, gap / this.opts.speed);
        await this.harness.page.waitForTimeout(scaledGap);
      } else if (this.opts.fixedDelay > 0) {
        await this.harness.page.waitForTimeout(this.opts.fixedDelay / this.opts.speed);
      }

      await this.playAction(action);
    }

    console.log(`\n  Replay complete (${actions.length} actions)\n`);
  }

  /* ── replay single action ──────────────────────────────── */

  async playAction(action: RecordedAction): Promise<void> {
    const sel = action.selector;

    try {
      switch (action.action) {
        case "goto":
          await this.harness.goto(action.url || "/");
          break;

        case "click":
          if (sel) await this.harness.click(sel);
          break;

        case "dblclick":
          if (sel) await this.harness.dblclick(sel);
          break;

        case "fill":
          if (sel && action.value !== undefined) await this.harness.fill(sel, action.value);
          break;

        case "type":
          if (sel && action.value !== undefined) await this.harness.type(sel, action.value);
          break;

        case "press":
          if (action.value) await this.harness.press(action.value);
          break;

        case "hover":
          if (sel) await this.harness.hover(sel);
          break;

        case "check":
          if (sel) await this.harness.check(sel);
          break;

        case "uncheck":
          if (sel) await this.harness.uncheck(sel);
          break;

        case "select":
          if (sel && action.value !== undefined) await this.harness.select(sel, action.value);
          break;

        case "scroll":
          if (action.scrollDelta) await this.harness.scroll(action.scrollDelta.y);
          break;

        case "wait":
          if (sel) await this.harness.waitFor(sel);
          break;

        default:
          console.log(`  [skip] Unknown action: ${action.action}`);
      }
    } catch (err) {
      console.log(`  [warn] Step #${action.step} ${action.action} failed: ${(err as Error).message}`);
    }
  }
}
