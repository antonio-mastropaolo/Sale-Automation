/* ------------------------------------------------------------------ */
/*  Action Recorder                                                     */
/*  Injects browser-side event listeners that capture user actions       */
/*  and stream them back to Node.js via page.exposeFunction().           */
/*  Saves a structured JSON recording that can be replayed.              */
/* ------------------------------------------------------------------ */

import { Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import type { RecordedAction, Recording } from "./types";
import { VisualHarness } from "./visual-harness";

const RECORDINGS_DIR = path.join(__dirname, "recordings");

export class ActionRecorder {
  private actions: RecordedAction[] = [];
  private startTime = 0;
  private stepCounter = 0;
  private stopped = false;
  private resolveStop: (() => void) | null = null;

  constructor(
    private page: Page,
    private harness?: VisualHarness,
  ) {}

  /* ── start recording ───────────────────────────────────── */

  async start(): Promise<void> {
    this.actions = [];
    this.stepCounter = 0;
    this.startTime = Date.now();
    this.stopped = false;

    // Expose callback for browser → Node.js action streaming
    await this.page.exposeFunction("__vhRecordAction", (raw: string) => {
      if (this.stopped) return;
      const data = JSON.parse(raw);
      this.stepCounter++;
      const action: RecordedAction = {
        step: this.stepCounter,
        action: data.action,
        selector: data.selector,
        value: data.value,
        url: data.url,
        scrollDelta: data.scrollDelta,
        coords: data.coords,
        timestamp: Date.now() - this.startTime,
        label: data.label,
      };
      this.actions.push(action);
      console.log(
        `  #${action.step} ${action.action} ${action.selector || action.url || ""} ${action.value ? '"' + action.value + '"' : ""}`,
      );
    });

    // Expose stop function
    await this.page.exposeFunction("__vhStopRecording", () => {
      this.stopped = true;
      this.resolveStop?.();
    });

    // Inject the browser-side recorder
    await this.page.addInitScript(BROWSER_RECORDER_SCRIPT);
    // Also run it immediately for the current page
    await this.page.evaluate(BROWSER_RECORDER_SCRIPT);

    // Show recording badge
    if (this.harness) {
      await this.harness.showRecordingBadge();
    }

    // Listen for navigation events (from Node side)
    this.page.on("framenavigated", (frame) => {
      if (frame === this.page.mainFrame() && !this.stopped) {
        this.stepCounter++;
        this.actions.push({
          step: this.stepCounter,
          action: "goto",
          url: frame.url(),
          timestamp: Date.now() - this.startTime,
          label: `Navigate to ${frame.url()}`,
        });
      }
    });
  }

  /* ── wait for user to stop ─────────────────────────────── */

  async waitForStop(): Promise<void> {
    return new Promise((resolve) => {
      this.resolveStop = resolve;
      // Also stop on page close
      this.page.on("close", () => {
        this.stopped = true;
        resolve();
      });
    });
  }

  /* ── save recording ────────────────────────────────────── */

  async save(filepath?: string): Promise<string> {
    if (!filepath) {
      if (!fs.existsSync(RECORDINGS_DIR)) fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
      filepath = path.join(RECORDINGS_DIR, `session-${Date.now()}.json`);
    }

    const viewport = this.page.viewportSize() || { width: 1280, height: 720 };

    const recording: Recording = {
      createdAt: new Date().toISOString(),
      baseURL: new URL(this.page.url()).origin,
      viewport,
      actions: this.actions,
    };

    fs.writeFileSync(filepath, JSON.stringify(recording, null, 2));
    console.log(`\n  Recording saved → ${path.relative(process.cwd(), filepath)}`);
    console.log(`  Total actions: ${this.actions.length}`);
    return filepath;
  }

  getActions(): RecordedAction[] {
    return [...this.actions];
  }
}

/* ================================================================== */
/*  Browser-side recorder script                                        */
/*  Injected into every page via addInitScript.                         */
/* ================================================================== */

const BROWSER_RECORDER_SCRIPT = /* js */ `
(() => {
  if (window.__vhRecorderActive) return;
  window.__vhRecorderActive = true;

  /* ── selector generator ──────────────────────────────── */

  function genSelector(el) {
    if (!el || el === document.body || el === document.documentElement) return 'body';

    // data-testid
    if (el.dataset && el.dataset.testid) return '[data-testid="' + el.dataset.testid + '"]';

    // id
    if (el.id && !el.id.startsWith('vh-') && !el.id.startsWith(':')) return '#' + CSS.escape(el.id);

    // aria-label
    const aria = el.getAttribute('aria-label');
    if (aria) return '[aria-label="' + aria + '"]';

    // placeholder (inputs)
    if (el.placeholder) return el.tagName.toLowerCase() + '[placeholder="' + el.placeholder + '"]';

    // name attribute (inputs)
    if (el.tagName === 'INPUT' && el.name) return 'input[name="' + el.name + '"]';

    // buttons/links with short text
    if (['A', 'BUTTON'].includes(el.tagName)) {
      const txt = (el.textContent || '').trim();
      if (txt.length > 0 && txt.length <= 60) {
        return el.tagName.toLowerCase() + ':has-text("' + txt.replace(/"/g, '\\\\"') + '")';
      }
    }

    // role + name
    const role = el.getAttribute('role');
    if (role) {
      const txt = (el.textContent || '').trim().slice(0, 40);
      if (txt) return 'role=' + role + '[name="' + txt.replace(/"/g, '\\\\"') + '"]';
    }

    // CSS path fallback
    return cssPath(el);
  }

  function cssPath(el) {
    const parts = [];
    let node = el;
    while (node && node !== document.body && node !== document.documentElement) {
      let sel = node.tagName.toLowerCase();
      if (node.id && !node.id.startsWith('vh-') && !node.id.startsWith(':')) {
        parts.unshift('#' + CSS.escape(node.id));
        break;
      }
      const classes = [...(node.classList || [])]
        .filter(c => !c.startsWith('vh-'))
        .slice(0, 3);
      if (classes.length) sel += '.' + classes.map(c => CSS.escape(c)).join('.');
      const parent = node.parentElement;
      if (parent) {
        const siblings = [...parent.children].filter(c => c.tagName === node.tagName);
        if (siblings.length > 1) {
          sel += ':nth-child(' + ([...parent.children].indexOf(node) + 1) + ')';
        }
      }
      parts.unshift(sel);
      node = node.parentElement;
    }
    return parts.join(' > ');
  }

  /* ── event listeners ─────────────────────────────────── */

  function isOverlay(el) {
    let node = el;
    while (node) {
      if (node.id && node.id.startsWith('vh-')) return true;
      node = node.parentElement;
    }
    return false;
  }

  function send(data) {
    try { window.__vhRecordAction(JSON.stringify(data)); } catch {}
  }

  // Click
  document.addEventListener('click', (e) => {
    if (isOverlay(e.target)) return;
    send({
      action: 'click',
      selector: genSelector(e.target),
      coords: { x: e.clientX, y: e.clientY },
      label: 'Click ' + genSelector(e.target),
    });
  }, { capture: true });

  // Double-click
  document.addEventListener('dblclick', (e) => {
    if (isOverlay(e.target)) return;
    send({
      action: 'dblclick',
      selector: genSelector(e.target),
      coords: { x: e.clientX, y: e.clientY },
      label: 'Double-click ' + genSelector(e.target),
    });
  }, { capture: true });

  // Input / change (for fills)
  document.addEventListener('change', (e) => {
    if (isOverlay(e.target)) return;
    const el = e.target;
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
      send({
        action: el.tagName === 'SELECT' ? 'select' : 'fill',
        selector: genSelector(el),
        value: el.value,
        label: (el.tagName === 'SELECT' ? 'Select' : 'Fill') + ' ' + genSelector(el) + ' = "' + el.value + '"',
      });
    }
  }, { capture: true });

  // Keyboard (special keys only)
  document.addEventListener('keydown', (e) => {
    if (isOverlay(e.target)) return;
    const special = ['Enter', 'Escape', 'Tab', 'Backspace', 'Delete', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    if (special.includes(e.key) || e.ctrlKey || e.metaKey) {
      const combo = [
        e.ctrlKey ? 'Control' : '',
        e.metaKey ? 'Meta' : '',
        e.shiftKey ? 'Shift' : '',
        e.altKey ? 'Alt' : '',
        e.key,
      ].filter(Boolean).join('+');
      send({
        action: 'press',
        value: combo,
        selector: genSelector(e.target),
        label: 'Press ' + combo,
      });
    }
  }, { capture: true });

  // Scroll
  let scrollTimeout;
  let scrollAccum = { x: 0, y: 0 };
  document.addEventListener('scroll', () => {
    scrollAccum.y = window.scrollY;
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      send({
        action: 'scroll',
        scrollDelta: { ...scrollAccum },
        label: 'Scroll to Y=' + scrollAccum.y,
      });
    }, 200);
  }, { capture: true, passive: true });

  /* ── stop recording via keyboard ─────────────────────── */

  document.addEventListener('keydown', (e) => {
    // Ctrl+Shift+S or Cmd+Shift+S to stop recording
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
      e.preventDefault();
      try { window.__vhStopRecording(); } catch {}
    }
  });

  console.log('[Visual Recorder] Active — press Cmd/Ctrl+Shift+S to stop');
})();
`;
