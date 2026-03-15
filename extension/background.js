/**
 * ListBlitz — Background Service Worker
 *
 * Manages platform connections, session detection, and
 * orchestrates listing creation across 8 marketplaces.
 */

// ── Platform definitions ──────────────────────────────────────

const PLATFORMS = {
  depop: {
    name: "Depop",
    domains: ["depop.com", ".depop.com"],
    loginUrl: "https://www.depop.com/login/",
    sellUrl: "https://www.depop.com/products/create/",
    authCookies: ["_depop_session", "depop_session", "connect.sid"],
    authIndicators: ["session", "token", "auth", "user"],
  },
  grailed: {
    name: "Grailed",
    domains: ["grailed.com", ".grailed.com"],
    loginUrl: "https://www.grailed.com/users/sign_in",
    sellUrl: "https://www.grailed.com/listings/new",
    authCookies: ["_grailed_session", "_session_id", "remember_user_token"],
    authIndicators: ["session", "token", "remember"],
  },
  poshmark: {
    name: "Poshmark",
    domains: ["poshmark.com", ".poshmark.com"],
    loginUrl: "https://poshmark.com/login",
    sellUrl: "https://poshmark.com/create-listing",
    authCookies: ["_poshmark_session", "ps_session", "jwt"],
    authIndicators: ["session", "jwt", "token", "auth"],
  },
  mercari: {
    name: "Mercari",
    domains: ["mercari.com", ".mercari.com"],
    loginUrl: "https://www.mercari.com/login/",
    sellUrl: "https://www.mercari.com/sell/",
    authCookies: ["_mercari_session", "session_id", "mercari_token"],
    authIndicators: ["session", "token", "mercari"],
  },
  ebay: {
    name: "eBay",
    domains: ["ebay.com", ".ebay.com", "signin.ebay.com"],
    loginUrl: "https://signin.ebay.com/",
    sellUrl: "https://www.ebay.com/sl/sell",
    authCookies: ["ebay", "nonsession", "s", "ds2", "dp1"],
    authIndicators: ["nonsession", "ebay", "ds2"],
  },
  vinted: {
    name: "Vinted",
    // Vinted uses country-specific domains — check all major ones
    domains: ["vinted.com", ".vinted.com", "vinted.fr", ".vinted.fr", "vinted.de", ".vinted.de", "vinted.co.uk", ".vinted.co.uk", "vinted.it", ".vinted.it", "vinted.es", ".vinted.es", "vinted.pl", ".vinted.pl"],
    loginUrl: "https://www.vinted.com/member/login",
    sellUrl: "https://www.vinted.com/items/new",
    authCookies: ["_vinted_fr_session", "_vinted_session", "access_token_web", "refresh_token_web", "v_sid"],
    authIndicators: ["session", "token", "access_token", "v_sid"],
  },
  facebook: {
    name: "Facebook Marketplace",
    domains: ["facebook.com", ".facebook.com", "www.facebook.com"],
    loginUrl: "https://www.facebook.com/login",
    sellUrl: "https://www.facebook.com/marketplace/create/item",
    // Facebook auth cookies — c_user is the key indicator of a logged-in user
    authCookies: ["c_user", "xs", "datr", "sb", "fr"],
    authIndicators: ["c_user"], // c_user alone confirms login
  },
  vestiaire: {
    name: "Vestiaire Collective",
    domains: ["vestiairecollective.com", ".vestiairecollective.com", "us.vestiairecollective.com"],
    loginUrl: "https://www.vestiairecollective.com/login/",
    sellUrl: "https://www.vestiairecollective.com/sell/",
    authCookies: ["_vestiaire_session", "vc_token", "PHPSESSID", "vcsid"],
    authIndicators: ["session", "token", "PHPSESSID", "vcsid"],
  },
};

// ── Session detection ─────────────────────────────────────────

/**
 * Check if user is logged into a platform by scanning cookies
 * across all known domains for that platform.
 */
async function checkPlatformSession(platformId) {
  const platform = PLATFORMS[platformId];
  if (!platform) return { connected: false, error: "Unknown platform" };

  try {
    // Collect cookies from ALL known domains for this platform
    let allCookies = [];
    for (const domain of platform.domains) {
      try {
        const cookies = await chrome.cookies.getAll({ domain });
        allCookies = allCookies.concat(cookies);
      } catch {
        // Some domains might not have cookies — that's fine
      }
    }

    // Deduplicate by name
    const seen = new Set();
    const uniqueCookies = allCookies.filter((c) => {
      const key = `${c.name}:${c.domain}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const cookieCount = uniqueCookies.length;
    if (cookieCount === 0) {
      return { connected: false, hasCookies: false, cookieCount: 0, platform: platform.name };
    }

    // Check for known auth cookies (exact match)
    const hasKnownAuthCookie = platform.authCookies.some((name) =>
      uniqueCookies.some((c) => c.name === name)
    );

    // Check for auth indicators (substring match)
    const hasAuthIndicator = platform.authIndicators.some((indicator) =>
      uniqueCookies.some((c) => c.name.toLowerCase().includes(indicator.toLowerCase()))
    );

    // For Facebook specifically, c_user cookie is the definitive auth check
    let connected = hasKnownAuthCookie || hasAuthIndicator;

    // Extra validation: some platforms set cookies even when logged out
    // If we only have generic cookies (like CSRF tokens) but no session, not connected
    if (connected && cookieCount < 3 && !hasKnownAuthCookie) {
      connected = false; // Likely just CSRF/tracking cookies, not a real session
    }

    return {
      connected,
      hasCookies: true,
      cookieCount,
      platform: platform.name,
      matchedCookies: hasKnownAuthCookie ? "exact" : hasAuthIndicator ? "indicator" : "none",
    };
  } catch (err) {
    return { connected: false, error: err.message, platform: platform.name };
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
async function publishToPlatform(platformId, listingData) {
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
      results[id] = await publishToPlatform(id, listingData);
      // Small delay between tabs so they don't all open at once
      await new Promise((r) => setTimeout(r, 500));
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
    case "CHECK_SESSION":
      checkPlatformSession(data.platform).then(sendResponse);
      return true;

    case "CHECK_ALL_SESSIONS":
      checkAllSessions().then(sendResponse);
      return true;

    case "PUBLISH_TO_PLATFORM":
      publishToPlatform(data.platform, data.listing)
        .then(sendResponse)
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true;

    case "PUBLISH_TO_MULTIPLE":
      publishToMultiple(data.platforms, data.listing).then(sendResponse);
      return true;

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

    case "GET_PENDING_LISTING":
      chrome.storage.local.get(`pending_listing_${data.platform}`).then((result) => {
        const listing = result[`pending_listing_${data.platform}`];
        chrome.storage.local.remove(`pending_listing_${data.platform}`);
        sendResponse({ listing: listing || null });
      });
      return true;

    case "LISTING_PUBLISHED":
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

    // Get platform info (for popup to display)
    case "GET_PLATFORMS":
      sendResponse(
        Object.fromEntries(
          Object.entries(PLATFORMS).map(([id, p]) => [id, { name: p.name, loginUrl: p.loginUrl }])
        )
      );
      return false;

    default:
      sendResponse({ error: "Unknown action" });
      return false;
  }
});

// ── External message handler (from ListBlitz web app) ─────────

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
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
  chrome.action.setBadgeBackgroundColor({ color: connected > 0 ? "#007AFF" : "#FF3B30" });
}

chrome.alarms.create("check-sessions", { periodInMinutes: 5 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "check-sessions") updateBadge();
});

// Update on tab changes (user might have just logged in)
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "complete") {
    // Debounce — only check if the URL matches a known platform
    chrome.tabs.get(tabId, (tab) => {
      if (!tab?.url) return;
      const url = tab.url.toLowerCase();
      const isMarketplace = Object.values(PLATFORMS).some((p) =>
        p.domains.some((d) => url.includes(d.replace(".", "")))
      );
      if (isMarketplace) updateBadge();
    });
  }
});

// Initial check
updateBadge();
