/**
 * ListBlitz — Marketplace Content Script
 *
 * Runs on Depop, Grailed, Poshmark, Mercari, eBay, Vinted, Facebook Marketplace, and Vestiaire Collective.
 * Detects which platform we're on, checks for pending listings,
 * and auto-fills the listing creation form.
 */

(function () {
  "use strict";

  // ── Detect platform ──────────────────────────────────────

  const hostname = window.location.hostname.replace("www.", "");
  let platform = null;

  if (hostname.includes("depop.com")) platform = "depop";
  else if (hostname.includes("grailed.com")) platform = "grailed";
  else if (hostname.includes("poshmark.com")) platform = "poshmark";
  else if (hostname.includes("mercari.com")) platform = "mercari";
  else if (hostname.includes("ebay.com")) platform = "ebay";
  else if (hostname.includes("vinted.com")) platform = "vinted";
  else if (hostname.includes("facebook.com")) platform = "facebook";
  else if (hostname.includes("vestiairecollective.com")) platform = "vestiaire";

  if (!platform) return;

  console.log(`[ListBlitz] Active on ${platform}`);

  // ── Check for pending listing to auto-fill ──────────────

  async function checkPendingListing() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: "GET_PENDING_LISTING", data: { platform } },
        (response) => resolve(response?.listing || null)
      );
    });
  }

  // ── Form filling utilities ──────────────────────────────

  function setInputValue(selector, value) {
    const el = document.querySelector(selector);
    if (!el || !value) return false;
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, "value"
    )?.set || Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, "value"
    )?.set;
    if (nativeSetter) nativeSetter.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  function clickElement(selector) {
    const el = document.querySelector(selector);
    if (el) { el.click(); return true; }
    return false;
  }

  function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve) => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);
      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) { observer.disconnect(); resolve(el); }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => { observer.disconnect(); resolve(null); }, timeout);
    });
  }

  // ── Platform-specific form fillers ──────────────────────

  const FILLERS = {
    async depop(listing) {
      // Depop's create listing page
      await waitForElement('input[name="title"], [data-testid="listing-title"]');
      setInputValue('input[name="title"], [data-testid="listing-title"]', listing.title);
      setInputValue('textarea[name="description"], [data-testid="listing-description"]', listing.description);
      setInputValue('input[name="price"], [data-testid="listing-price"]', String(listing.price));
      console.log("[ListBlitz] Depop form filled");
    },

    async grailed(listing) {
      await waitForElement('input[name="designer"], input[name="title"], [class*="listing-form"]');
      // Grailed uses designer/brand as a primary field
      setInputValue('input[name="designer"]', listing.brand);
      setInputValue('input[name="title"]', listing.title);
      setInputValue('textarea[name="description"]', listing.description);
      setInputValue('input[name="price"]', String(listing.price));
      console.log("[ListBlitz] Grailed form filled");
    },

    async poshmark(listing) {
      await waitForElement('#listing-editor, [data-testid="listing-editor"], input[name="title"]');
      setInputValue('input[name="title"]', listing.title);
      setInputValue('textarea[name="description"]', listing.description);
      setInputValue('input[name="listingPrice"], input[name="price"]', String(listing.price));
      // Set brand
      setInputValue('input[name="brand"]', listing.brand);
      console.log("[ListBlitz] Poshmark form filled");
    },

    async mercari(listing) {
      await waitForElement('input[name="name"], [data-testid="sell-form"]');
      setInputValue('input[name="name"]', listing.title);
      setInputValue('textarea[name="description"]', listing.description);
      setInputValue('input[name="price"]', String(listing.price));
      console.log("[ListBlitz] Mercari form filled");
    },

    async ebay(listing) {
      await waitForElement('#s0-1-0-39-3-title, input[name="title"], [data-testid="item-title"]');
      setInputValue('#s0-1-0-39-3-title, input[name="title"], [data-testid="item-title"]', listing.title);
      // eBay description is usually in an iframe or rich text editor
      const descField = document.querySelector('textarea[name="description"], [data-testid="item-description"]');
      if (descField) setInputValue('textarea[name="description"]', listing.description);
      setInputValue('input[name="price"], [data-testid="price-input"]', String(listing.price));
      console.log("[ListBlitz] eBay form filled");
    },

    async vinted(listing) {
      await waitForElement('input[name="title"], [data-testid="item-title"]');
      setInputValue('input[name="title"], [data-testid="item-title"]', listing.title);
      setInputValue('textarea[name="description"], [data-testid="item-description"]', listing.description);
      setInputValue('input[name="price"], [data-testid="item-price"]', String(listing.price));
      console.log("[ListBlitz] Vinted form filled");
    },

    async facebook(listing) {
      await waitForElement('input[aria-label="Title"], input[name="title"], [data-testid="marketplace-create-title"]');
      setInputValue('input[aria-label="Title"], input[name="title"]', listing.title);
      setInputValue('textarea[aria-label="Description"], textarea[name="description"]', listing.description);
      setInputValue('input[aria-label="Price"], input[name="price"]', String(listing.price));
      console.log("[ListBlitz] Facebook Marketplace form filled");
    },

    async vestiaire(listing) {
      await waitForElement('input[name="title"], [data-testid="sell-title"]');
      setInputValue('input[name="title"], [data-testid="sell-title"]', listing.title);
      setInputValue('textarea[name="description"], [data-testid="sell-description"]', listing.description);
      setInputValue('input[name="price"], [data-testid="sell-price"]', String(listing.price));
      if (listing.brand) setInputValue('input[name="brand"]', listing.brand);
      console.log("[ListBlitz] Vestiaire Collective form filled");
    },
  };

  // ── Main: check for pending listing and fill ────────────

  async function main() {
    // Only run on listing creation pages
    const path = window.location.pathname;
    const isListingPage =
      path.includes("create") ||
      path.includes("sell") ||
      path.includes("new") ||
      path.includes("listing");

    if (!isListingPage) return;

    const listing = await checkPendingListing();
    if (!listing) return;

    // Check listing is fresh (< 5 minutes old)
    if (Date.now() - listing.timestamp > 5 * 60 * 1000) return;

    console.log("[ListBlitz] Found pending listing, filling form...", listing);

    // Wait a bit for the page to fully render
    await new Promise((r) => setTimeout(r, 2000));

    // Fill the form
    const filler = FILLERS[platform];
    if (filler) {
      try {
        await filler(listing);
        // Show a notification banner
        showBanner(`ListBlitz filled this listing: "${listing.title}". Review and submit.`);
        // Notify background that we're ready
        chrome.runtime.sendMessage({
          action: "LISTING_PUBLISHED",
          data: { platform, success: true, url: window.location.href },
        });
      } catch (err) {
        console.error("[ListBlitz] Error filling form:", err);
        showBanner("ListBlitz couldn't auto-fill this form. Please fill manually.", true);
      }
    }
  }

  // ── UI: notification banner ─────────────────────────────

  function showBanner(message, isError = false) {
    const banner = document.createElement("div");
    banner.id = "listblitz-banner";
    banner.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; z-index: 999999;
      padding: 12px 20px; font-family: system-ui, sans-serif; font-size: 14px;
      display: flex; align-items: center; gap: 10px; justify-content: center;
      background: ${isError ? "#fef2f2" : "#f0fdfa"};
      color: ${isError ? "#991b1b" : "#115e59"};
      border-bottom: 1px solid ${isError ? "#fecaca" : "#99f6e4"};
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      animation: listblitz-slide-in 0.3s ease-out;
    `;
    banner.innerHTML = `
      <span style="font-weight:600;">⚡ ListBlitz</span>
      <span>${message}</span>
      <button onclick="this.parentElement.remove()" style="
        margin-left: auto; background: none; border: none; cursor: pointer;
        font-size: 18px; color: inherit; padding: 0 4px;
      ">×</button>
    `;

    // Add animation
    const style = document.createElement("style");
    style.textContent = `
      @keyframes listblitz-slide-in {
        from { transform: translateY(-100%); }
        to { transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);

    // Remove old banner if exists
    document.getElementById("listblitz-banner")?.remove();
    document.body.prepend(banner);

    // Auto-remove after 10 seconds
    setTimeout(() => banner.remove(), 10000);
  }

  // Run after page loads
  if (document.readyState === "complete") main();
  else window.addEventListener("load", main);
})();
