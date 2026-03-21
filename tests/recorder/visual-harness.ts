/* ------------------------------------------------------------------ */
/*  Visual Harness                                                      */
/*  Injects cursor, highlights, action labels & log into the page.      */
/*  Wraps Playwright Page actions so every step is visually visible —    */
/*  even in recorded video at high speed.                                */
/* ------------------------------------------------------------------ */

import { Page } from "@playwright/test";
import type { VisualHarnessOptions } from "./types";

const DEFAULTS: VisualHarnessOptions = {
  actionDelay: 250,
  showCursor: true,
  showHighlights: true,
  showActionLabel: true,
  showStepCounter: true,
  showActionLog: true,
  actionLogMax: 8,
};

/* ---- injected CSS ------------------------------------------------ */

const VISUAL_CSS = /* css */ `
/* ── cursor ─────────────────────────────────────────────── */
#vh-cursor {
  position: fixed;
  width: 22px; height: 22px;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.85);
  border: 3px solid #fff;
  box-shadow: 0 0 18px rgba(239, 68, 68, 0.55), 0 2px 6px rgba(0,0,0,0.3);
  pointer-events: none;
  z-index: 2147483647;
  transform: translate(-50%, -50%);
  transition: left 0.25s cubic-bezier(.4,0,.2,1), top 0.25s cubic-bezier(.4,0,.2,1);
  will-change: left, top;
}
@keyframes vh-click-ring {
  0%   { transform: translate(-50%,-50%) scale(1); opacity: 1; }
  100% { transform: translate(-50%,-50%) scale(2.8); opacity: 0; }
}
#vh-cursor.vh-clicking::after {
  content: '';
  position: absolute; inset: -4px;
  border-radius: 50%;
  border: 2px solid rgba(239, 68, 68, 0.7);
  animation: vh-click-ring 0.35s ease-out forwards;
}

/* ── element highlight ──────────────────────────────────── */
.vh-highlight {
  outline: 3px solid #3b82f6 !important;
  outline-offset: 3px !important;
  box-shadow: 0 0 0 6px rgba(59,130,246,0.15) !important;
  transition: outline 0.15s, box-shadow 0.15s !important;
}

/* ── action label (top-center) ──────────────────────────── */
#vh-action-label {
  position: fixed; top: 12px; left: 50%;
  transform: translateX(-50%);
  background: rgba(15, 23, 42, 0.92);
  color: #f1f5f9;
  font: 700 13px/1.4 'SF Mono','Cascadia Code','Consolas',monospace;
  padding: 7px 18px;
  border-radius: 8px;
  z-index: 2147483647;
  pointer-events: none;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.12s;
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
}
#vh-action-label.vh-visible { opacity: 1; }
#vh-action-label .vh-act  { color: #60a5fa; }
#vh-action-label .vh-tgt  { color: #fbbf24; }
#vh-action-label .vh-val  { color: #4ade80; }

/* ── step counter (top-right) ───────────────────────────── */
#vh-step-counter {
  position: fixed; top: 12px; right: 12px;
  background: rgba(15, 23, 42, 0.92);
  color: #4ade80;
  font: 600 12px/1.4 'SF Mono','Cascadia Code','Consolas',monospace;
  padding: 6px 14px;
  border-radius: 8px;
  z-index: 2147483647;
  pointer-events: none;
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
}

/* ── action log (bottom-right) ──────────────────────────── */
#vh-action-log {
  position: fixed; bottom: 12px; right: 12px;
  width: 340px; max-height: 220px;
  overflow-y: auto;
  background: rgba(15, 23, 42, 0.92);
  color: #cbd5e1;
  font: 400 11px/1.5 'SF Mono','Cascadia Code','Consolas',monospace;
  padding: 8px 10px;
  border-radius: 8px;
  z-index: 2147483647;
  pointer-events: none;
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
}
.vh-log-entry {
  padding: 2px 0;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  display: flex; gap: 6px;
}
.vh-log-entry:last-child { border-bottom: none; }
.vh-log-step  { color: #64748b; min-width: 28px; }
.vh-log-act   { color: #60a5fa; min-width: 46px; }
.vh-log-tgt   { color: #fbbf24; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vh-log-val   { color: #4ade80; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* ── recording indicator ────────────────────────────────── */
#vh-rec-badge {
  position: fixed; top: 12px; left: 12px;
  display: flex; align-items: center; gap: 8px;
  background: rgba(15, 23, 42, 0.92);
  color: #f87171;
  font: 700 12px/1.4 'SF Mono','Cascadia Code','Consolas',monospace;
  padding: 6px 14px;
  border-radius: 8px;
  z-index: 2147483647;
  pointer-events: none;
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
}
@keyframes vh-rec-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
#vh-rec-dot {
  width: 10px; height: 10px;
  border-radius: 50%;
  background: #ef4444;
  animation: vh-rec-pulse 1s infinite;
}
`;

/* ---- injected JS (creates DOM elements) ------------------- */

const VISUAL_JS_INIT = /* js */ `
(() => {
  if (document.getElementById('vh-cursor')) return;

  const cursor = document.createElement('div');
  cursor.id = 'vh-cursor';
  cursor.style.left = '-40px';
  cursor.style.top = '-40px';
  document.body.appendChild(cursor);

  const label = document.createElement('div');
  label.id = 'vh-action-label';
  document.body.appendChild(label);

  const counter = document.createElement('div');
  counter.id = 'vh-step-counter';
  counter.textContent = 'Step 0';
  document.body.appendChild(counter);

  const log = document.createElement('div');
  log.id = 'vh-action-log';
  document.body.appendChild(log);
})();
`;

/* ================================================================== */
/*  VisualHarness class                                                 */
/* ================================================================== */

export class VisualHarness {
  private opts: VisualHarnessOptions;
  private step = 0;
  private total = 0;
  private injected = false;

  constructor(
    public readonly page: Page,
    options?: Partial<VisualHarnessOptions>,
  ) {
    this.opts = { ...DEFAULTS, ...options };
    // Re-inject after every navigation
    this.page.on("load", () => {
      this.injected = false;
    });
  }

  /* ── injection ─────────────────────────────────────────── */

  async inject(): Promise<void> {
    if (this.injected) return;
    try {
      await this.page.addStyleTag({ content: VISUAL_CSS });
      await this.page.evaluate(VISUAL_JS_INIT);
      this.injected = true;
    } catch {
      /* page may have closed */
    }
  }

  private async ensureInjected(): Promise<void> {
    if (!this.injected) await this.inject();
  }

  setTotalSteps(total: number): void {
    this.total = total;
  }

  /* ── visual primitives ─────────────────────────────────── */

  private async moveCursor(selector: string): Promise<void> {
    if (!this.opts.showCursor) return;
    await this.ensureInjected();
    try {
      const box = await this.page.locator(selector).first().boundingBox({ timeout: 3000 });
      if (!box) return;
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      await this.page.evaluate(
        ([x, y]) => {
          const c = document.getElementById("vh-cursor");
          if (c) { c.style.left = x + "px"; c.style.top = y + "px"; }
        },
        [cx, cy] as [number, number],
      );
    } catch {
      /* element may not be visible */
    }
  }

  private async moveCursorToCoords(x: number, y: number): Promise<void> {
    if (!this.opts.showCursor) return;
    await this.ensureInjected();
    await this.page.evaluate(
      ([cx, cy]) => {
        const c = document.getElementById("vh-cursor");
        if (c) { c.style.left = cx + "px"; c.style.top = cy + "px"; }
      },
      [x, y] as [number, number],
    );
  }

  private async clickEffect(): Promise<void> {
    await this.page.evaluate(() => {
      const c = document.getElementById("vh-cursor");
      if (!c) return;
      c.classList.remove("vh-clicking");
      void c.offsetWidth; // force reflow
      c.classList.add("vh-clicking");
      setTimeout(() => c.classList.remove("vh-clicking"), 400);
    });
  }

  private async highlight(selector: string): Promise<void> {
    if (!this.opts.showHighlights) return;
    await this.ensureInjected();
    try {
      const loc = this.page.locator(selector).first();
      if (await loc.isVisible({ timeout: 2000 })) {
        await loc.evaluate((el) => {
          el.classList.add("vh-highlight");
          setTimeout(() => el.classList.remove("vh-highlight"), 800);
        });
      }
    } catch {
      /* element may not exist */
    }
  }

  private async showLabel(action: string, target?: string, value?: string): Promise<void> {
    if (!this.opts.showActionLabel) return;
    await this.ensureInjected();
    const parts: string[] = [];
    parts.push(`<span class="vh-act">${action}</span>`);
    if (target) parts.push(`<span class="vh-tgt">${this.truncate(target, 50)}</span>`);
    if (value) parts.push(`<span class="vh-val">"${this.truncate(value, 30)}"</span>`);
    const html = parts.join("  ");
    await this.page.evaluate((h) => {
      const el = document.getElementById("vh-action-label");
      if (!el) return;
      el.innerHTML = h;
      el.classList.add("vh-visible");
      clearTimeout((el as any).__hideTimer);
      (el as any).__hideTimer = setTimeout(() => el.classList.remove("vh-visible"), 1200);
    }, html);
  }

  private async updateStepCounter(): Promise<void> {
    if (!this.opts.showStepCounter) return;
    await this.ensureInjected();
    const text = this.total
      ? `Step ${this.step}/${this.total}`
      : `Step ${this.step}`;
    await this.page.evaluate((t) => {
      const el = document.getElementById("vh-step-counter");
      if (el) el.textContent = t;
    }, text);
  }

  private async addLogEntry(action: string, target?: string, value?: string): Promise<void> {
    if (!this.opts.showActionLog) return;
    await this.ensureInjected();
    const entry = { step: this.step, action, target: target || "", value: value || "" };
    await this.page.evaluate(
      ([e, max]) => {
        const log = document.getElementById("vh-action-log");
        if (!log) return;
        const div = document.createElement("div");
        div.className = "vh-log-entry";
        div.innerHTML = [
          `<span class="vh-log-step">#${e.step}</span>`,
          `<span class="vh-log-act">${e.action}</span>`,
          e.target ? `<span class="vh-log-tgt">${e.target}</span>` : "",
          e.value ? `<span class="vh-log-val">"${e.value}"</span>` : "",
        ].join("");
        log.appendChild(div);
        // trim old entries
        while (log.children.length > max) log.removeChild(log.firstChild!);
        log.scrollTop = log.scrollHeight;
      },
      [entry, this.opts.actionLogMax] as [typeof entry, number],
    );
  }

  private truncate(s: string, max: number): string {
    return s.length > max ? s.slice(0, max - 1) + "\u2026" : s;
  }

  /* ── delay helper ──────────────────────────────────────── */

  private async pause(): Promise<void> {
    if (this.opts.actionDelay > 0) {
      await this.page.waitForTimeout(this.opts.actionDelay);
    }
  }

  /* ── wrapped page actions ──────────────────────────────── */

  private async before(action: string, selector?: string, value?: string): Promise<void> {
    this.step++;
    await this.ensureInjected();
    if (selector) {
      await this.moveCursor(selector);
      await this.highlight(selector);
    }
    await this.showLabel(action, selector, value);
    await this.updateStepCounter();
    await this.addLogEntry(action, selector, value);
    await this.pause();
  }

  async goto(url: string): Promise<void> {
    this.step++;
    await this.showLabel("GOTO", url).catch(() => {});
    await this.updateStepCounter().catch(() => {});
    await this.addLogEntry("GOTO", url).catch(() => {});
    await this.page.goto(url, { waitUntil: "domcontentloaded" });
    this.injected = false;
    await this.ensureInjected();
  }

  async click(selector: string, timeout = 5000): Promise<void> {
    await this.before("CLICK", selector);
    await this.clickEffect();
    await this.page.locator(selector).first().click({ timeout });
  }

  async dblclick(selector: string, timeout = 5000): Promise<void> {
    await this.before("DBLCLICK", selector);
    await this.clickEffect();
    await this.page.locator(selector).first().dblclick({ timeout });
  }

  async fill(selector: string, value: string, timeout = 5000): Promise<void> {
    await this.before("FILL", selector, value);
    await this.page.locator(selector).first().fill(value, { timeout });
  }

  async type(selector: string, text: string, timeout = 5000): Promise<void> {
    await this.before("TYPE", selector, text);
    await this.page.locator(selector).first().pressSequentially(text, { delay: 40, timeout });
  }

  async press(key: string): Promise<void> {
    await this.before("PRESS", undefined, key);
    await this.page.keyboard.press(key);
  }

  async hover(selector: string, timeout = 5000): Promise<void> {
    await this.before("HOVER", selector);
    await this.page.locator(selector).first().hover({ timeout });
  }

  async check(selector: string, timeout = 5000): Promise<void> {
    await this.before("CHECK", selector);
    await this.page.locator(selector).first().check({ timeout });
  }

  async uncheck(selector: string, timeout = 5000): Promise<void> {
    await this.before("UNCHECK", selector);
    await this.page.locator(selector).first().uncheck({ timeout });
  }

  async select(selector: string, value: string, timeout = 5000): Promise<void> {
    await this.before("SELECT", selector, value);
    await this.page.locator(selector).first().selectOption(value, { timeout });
  }

  async scroll(deltaY: number): Promise<void> {
    const dir = deltaY > 0 ? "DOWN" : "UP";
    await this.before("SCROLL", undefined, `${dir} ${Math.abs(deltaY)}px`);
    await this.page.mouse.wheel(0, deltaY);
  }

  async waitFor(selector: string, timeout = 5000): Promise<void> {
    await this.before("WAIT", selector);
    await this.page.locator(selector).first().waitFor({ timeout });
  }

  async screenshot(name: string): Promise<Buffer> {
    await this.before("SCREENSHOT", undefined, name);
    return await this.page.screenshot({ fullPage: false });
  }

  /* ── recording badge ───────────────────────────────────── */

  async showRecordingBadge(): Promise<void> {
    await this.ensureInjected();
    await this.page.evaluate(() => {
      if (document.getElementById("vh-rec-badge")) return;
      const badge = document.createElement("div");
      badge.id = "vh-rec-badge";
      badge.innerHTML = '<div id="vh-rec-dot"></div> REC';
      document.body.appendChild(badge);
    });
  }

  async hideRecordingBadge(): Promise<void> {
    await this.page.evaluate(() => {
      document.getElementById("vh-rec-badge")?.remove();
    }).catch(() => {});
  }
}
