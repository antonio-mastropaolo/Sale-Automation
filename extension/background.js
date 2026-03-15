/**
 * ListBlitz — Background Service Worker
 *
 * Manages platform connections, session detection, and
 * orchestrates listing creation across marketplaces.
 */

// ── Platform definitions ──────────────────────────────────────

const PLATFORMS = {
  depop: {
    name: "Depop",
    domain: "depop.com",
    loginUrl: "https://www.depop.com/login/",
    sellUrl: "https://www.depop.com/products/create/",
    cookieNames: ["_depop_session", "depop_session", "connect.sid"],
  },
  grailed: {
    name: "Grailed",
    domain: "grailed.com",
    loginUrl: "https://www.grailed.com/users/sign_in",
    sellUrl: "https://www.grailed.com/listings/new",
    cookieNames: ["_grailed_session", "_session_id", "remember_user_token"],
  },
  poshmark: {
    name: "Poshmark",
    domain: "poshmark.com",
    loginUrl: "https://poshmark.com/login",
    sellUrl: "https://poshmark.com/create-listing",
    cookieNames: ["_poshmark_session", "ps_session", "jwt"],
  },
  mercari: {
    name: "Mercari",
    domain: "mercari.com",
    loginUrl: "https://www.mercari.com/login/",
    sellUrl: "https://www.mercari.com/sell/",
    cookieNames: ["_mercari_session", "session_id", "mercari_token"],
  },
  ebay: {
    name: "eBay",
    domain: "ebay.com",
    loginUrl: "https://signin.ebay.com/",
    sellUrl: "https://www.ebay.com/sl/sell",
    cookieNames: ["ebay", "nonsession", "s", "ds2"],
  },
};

// ── Session detection ─────────────────────────────────────────

/**
 * Check if user is logged into a platform by looking for session cookies
 */
async function checkPlatformSession(platformId) {
  const platform = PLATFORMS[platformId];
  if (!platform) return { connected: false };

  try {
    const cookies = await chrome.cookies.getAll({ domain: `.${platform.domain}` });
    const hasCookies = cookies.length > 0;

    // Look for known session cookie names
    const hasSession = platform.cookieNames.some((name) =>
      cookies.some(
        (c) => c.name.includes(name) || c.name.toLowerCase().includes("session") || c.name.toLowerCase().includes("token")
      )
    );

    // Also check for any auth-related cookies
    const hasAuth = cookies.some(
      (c) =>
        c.name.toLowerCase().includes("auth") ||
        c.name.toLowerCase().includes("jwt") ||
        c.name.toLowerCase().includes("user") ||
        c.name.toLowerCase().includes("login")
    );

    return {
      connected: hasSession || hasAuth,
      hasCookies,
      cookieCount: cookies.length,
      platform: platform.name,
    };
  } catch (err) {
    return { connected: false, error: err.message };
  }
}

/**
 * Check all platform sessions at once
 */
async function checkAllSessions() {
  const results = {};
  for (const id of Object.keys(PLATFORMS)) {
    results[id] = await checkPlatformSession(id);
  }
  return results;
}

// ── Listing creation orchestration ────────────────────────────

/**
 * Open a platform's listing creation page and inject the listing data.
 * The content script on that page will pick up the data and fill the form.
 */
async function publishToplatform(platformId, listingData) {
  const platform = PLATFORMS[platformId];
  if (!platform) throw new Error(`Unknown platform: ${platformId}`);

  // Store the listing data for the content script to pick up
  await chrome.storage.local.set({
    [`pending_listing_${platformId}`]: {
      ...listingData,
      timestamp: Date.now(),
    },
  });

  // Open the sell page
  const tab = await chrome.tabs.create({ url: platform.sellUrl, active: true });

  return { success: true, tabId: tab.id, platform: platform.name };
}

/**
 * Publish to multiple platforms sequentially
 */
async function publishToMultiple(platformIds, listingData) {
  const results = {};
  for (const id of platformIds) {
    try {
      results[id] = await publishToplatform(id, listingData);
    } catch (err) {
      results[id] = { success: false, error: err.message };
    }
  }
  return results;
}

// ── Message handler ───────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { action, data } = message;

  switch (action) {
    // ── Session checks ──
    case "CHECK_SESSION":
      checkPlatformSession(data.platform).then(sendResponse);
      return true; // async

    case "CHECK_ALL_SESSIONS":
      checkAllSessions().then(sendResponse);
      return true;

    // ── Publishing ──
    case "PUBLISH_TO_PLATFORM":
      publishToplatform(data.platform, data.listing).then(sendResponse).catch((err) => sendResponse({ success: false, error: err.message }));
      return true;

    case "PUBLISH_TO_MULTIPLE":
      publishToMultiple(data.platforms, data.listing).then(sendResponse);
      return true;

    // ── Platform login ──
    case "LOGIN_TO_PLATFORM": {
      const platform = PLATFORMS[data.platform];
      if (platform) {
        chrome.tabs.create({ url: platform.loginUrl, active: true });
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: "Unknown platform" });
      }
      return false;
    }

    // ── Get pending listing data (called by content scripts) ──
    case "GET_PENDING_LISTING":
      chrome.storage.local.get(`pending_listing_${data.platform}`).then((result) => {
        const listing = result[`pending_listing_${data.platform}`];
        // Clear it after reading
        chrome.storage.local.remove(`pending_listing_${data.platform}`);
        sendResponse({ listing: listing || null });
      });
      return true;

    // ── Listing published confirmation ──
    case "LISTING_PUBLISHED":
      // Notify the ListBlitz app tab
      chrome.tabs.query({ url: ["https://listblitz.io/*", "http://localhost:3000/*"] }, (tabs) => {
        for (const tab of tabs) {
          chrome.tabs.sendMessage(tab.id, {
            action: "PUBLISH_CONFIRMED",
            data: { platform: data.platform, url: data.url, success: data.success },
          });
        }
      });
      sendResponse({ received: true });
      return false;

    default:
      sendResponse({ error: "Unknown action" });
      return false;
  }
});

// ── External message handler (from ListBlitz web app) ─────────

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  // Only accept from our domains
  const allowed = ["https://listblitz.io", "http://localhost:3000"];
  const origin = sender.url ? new URL(sender.url).origin : "";
  if (!allowed.includes(origin)) {
    sendResponse({ error: "Unauthorized origin" });
    return;
  }

  // Route to same handler
  chrome.runtime.onMessage.dispatch(message, sender, sendResponse);
  return true;
});

// ── Badge: show connected platform count ──────────────────────

async function updateBadge() {
  const sessions = await checkAllSessions();
  const connected = Object.values(sessions).filter((s) => s.connected).length;
  chrome.action.setBadgeText({ text: connected > 0 ? String(connected) : "" });
  chrome.action.setBadgeBackgroundColor({ color: connected > 0 ? "#0d9488" : "#ef4444" });
}

// Check sessions periodically
chrome.alarms.create("check-sessions", { periodInMinutes: 5 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "check-sessions") updateBadge();
});

// Initial check
updateBadge();
