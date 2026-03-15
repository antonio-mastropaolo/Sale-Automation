/**
 * ListBlitz — Extension Popup
 */

const PLATFORM_COLORS = {
  depop: "#ff2300",
  grailed: "#333333",
  poshmark: "#c83264",
  mercari: "#4dc4c0",
  ebay: "#e53238",
  vinted: "#09877e",
  facebook: "#1877f2",
  vestiaire: "#b8860b",
};

const PLATFORM_NAMES = {
  depop: "Depop",
  grailed: "Grailed",
  poshmark: "Poshmark",
  mercari: "Mercari",
  ebay: "eBay",
  vinted: "Vinted",
  facebook: "Facebook Marketplace",
  vestiaire: "Vestiaire Collective",
};

async function loadSessions() {
  const container = document.getElementById("platforms");

  try {
    const sessions = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "CHECK_ALL_SESSIONS", data: {} }, resolve);
    });

    container.innerHTML = "";

    for (const [id, session] of Object.entries(sessions)) {
      const div = document.createElement("div");
      div.className = "platform";

      const connected = session.connected;
      const initial = PLATFORM_NAMES[id]?.[0] || "?";
      const color = PLATFORM_COLORS[id] || "#666";

      div.innerHTML = `
        <div class="icon" style="background:${color}">${initial}</div>
        <div class="info">
          <div class="name">${PLATFORM_NAMES[id] || id}</div>
          <div class="status ${connected ? "connected" : "disconnected"}">
            ${connected
              ? `Connected (${session.cookieCount} cookies)`
              : "Not connected"}
          </div>
        </div>
        <div class="dot ${connected ? "on" : "off"}"></div>
        ${!connected ? `<button class="btn-connect" data-platform="${id}">Log in</button>` : ""}
      `;

      container.appendChild(div);
    }

    // Attach click handlers for login buttons
    container.querySelectorAll(".btn-connect").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const platform = btn.dataset.platform;
        chrome.runtime.sendMessage({ action: "LOGIN_TO_PLATFORM", data: { platform } });
        window.close();
      });
    });
  } catch (err) {
    container.innerHTML = `<div class="loading">Error: ${err.message}</div>`;
  }
}

document.addEventListener("DOMContentLoaded", loadSessions);
