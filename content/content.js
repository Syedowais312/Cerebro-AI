// Content script: show a lightweight summary overlay near the top of the page
// Listens for messages from the extension to display the overlay.

(function() {
  const OVERLAY_ID = "cerebro-summary-overlay";

  function ensureStyles() {
    if (document.getElementById("cerebro-summary-style")) return;
    const style = document.createElement("style");
    style.id = "cerebro-summary-style";
    style.textContent = `
      #${OVERLAY_ID} {
        position: fixed;
        top: 8px;
        left: 50%;
        transform: translateX(-50%);
        background: #111827;
        color: #f9fafb;
        padding: 8px 12px;
        border-radius: 8px;
        box-shadow: 0 6px 18px rgba(0,0,0,0.25);
        z-index: 2147483647; /* Max to ensure visibility */
        max-width: min(740px, 90vw);
        font-size: 13px;
        line-height: 1.4;
        display: none;
      }
      #${OVERLAY_ID} .cerebro-close {
        margin-left: 10px;
        color: #9ca3af;
        cursor: pointer;
        font-weight: bold;
      }
    `;
    document.documentElement.appendChild(style);
  }

  function showOverlay(summaryText) {
    ensureStyles();
    let el = document.getElementById(OVERLAY_ID);
    if (!el) {
      el = document.createElement("div");
      el.id = OVERLAY_ID;
      const close = document.createElement("span");
      close.className = "cerebro-close";
      close.textContent = "×";
      close.addEventListener("click", () => hideOverlay());
      el.appendChild(close);
      document.documentElement.appendChild(el);
    }
    // Put text before close button
    el.firstChild?.nodeType === Node.TEXT_NODE && el.removeChild(el.firstChild);
    el.insertBefore(document.createTextNode(summaryText), el.querySelector(".cerebro-close"));
    el.style.display = "block";

    // Auto-hide after a few seconds
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(() => hideOverlay(), 4000);
  }

  function hideOverlay() {
    const el = document.getElementById(OVERLAY_ID);
    if (el) {
      el.style.display = "none";
    }
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.action === "showSummaryOverlay") {
      const text = (msg.summary || "").trim();
      if (text) showOverlay(text);
      sendResponse({ ok: true });
      return true;
    }
  });
})();