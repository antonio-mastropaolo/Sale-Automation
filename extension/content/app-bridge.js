/**
 * ListBlitz — App Bridge Content Script
 *
 * Runs on listblitz.io / localhost:3000.
 * Bridges messages between the web app and the Chrome extension.
 * The web app posts messages to window, this script forwards them
 * to the background service worker, and relays responses back.
 */

(function () {
  "use strict";

  console.log("[ListBlitz Extension] App bridge loaded");

  // ── Listen for messages from the web app ────────────────

  window.addEventListener("message", async (event) => {
    // Only accept messages from our own page
    if (event.source !== window) return;
    if (!event.data || event.data.source !== "listblitz-app") return;

    const { action, data, requestId } = event.data;

    try {
      // Forward to background service worker
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action, data }, (resp) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(resp);
          }
        });
      });

      // Send response back to web app
      window.postMessage(
        {
          source: "listblitz-extension",
          requestId,
          response,
        },
        "*"
      );
    } catch (err) {
      window.postMessage(
        {
          source: "listblitz-extension",
          requestId,
          error: err.message,
        },
        "*"
      );
    }
  });

  // ── Listen for messages from background (publish confirmations) ──

  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "PUBLISH_CONFIRMED") {
      window.postMessage(
        {
          source: "listblitz-extension",
          action: "PUBLISH_CONFIRMED",
          data: message.data,
        },
        "*"
      );
    }
  });

  // ── Announce extension presence to the web app ──────────

  window.postMessage(
    {
      source: "listblitz-extension",
      action: "EXTENSION_READY",
      data: { version: chrome.runtime.getManifest().version },
    },
    "*"
  );
})();
