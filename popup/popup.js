const state = {
  grouped: {},
  summariesByTabId: {},
};

document.getElementById("organize").addEventListener("click", async () => {
  showStatus("Organizing tabs...");
  chrome.runtime.sendMessage({ action: "organizeTabs" }, (response) => {
    if (response && response.success) {
      showStatus("Tabs organized successfully!");
      setTimeout(() => hideStatus(), 2000);
    } else {
      showStatus("Error organizing tabs", "error");
    }
  });
});

document.getElementById("clearGroups").addEventListener("click", async () => {
  showStatus("Clearing groups...");
  chrome.tabGroups.query({}, async (groups) => {
    for (const group of groups) {
      try {
        // Ungroup tabs by their IDs
        const tabs = await chrome.tabs.query({ groupId: group.id });
        const ids = tabs.map(t => t.id);
        if (ids.length) await chrome.tabs.ungroup(ids);
        await chrome.tabGroups.update(group.id, { collapsed: false, title: group.title });
      } catch (e) {
        console.log("Failed to ungroup", group.id, e);
      }
    }
    showStatus("Groups cleared!");
    setTimeout(() => hideStatus(), 2000);
  });
});

document.getElementById("search").addEventListener("input", (e) => {
  const q = e.target.value.trim().toLowerCase();
  renderTabs(state.grouped, q);
});

// Add toggle tabs functionality
const toggleTabsBtn = document.getElementById("toggleTabs");
let tabsHidden = false;

toggleTabsBtn.addEventListener("click", () => {
  tabsHidden = !tabsHidden;
  toggleTabsBtn.textContent = tabsHidden ? "Show Tabs" : "Hide Tabs";
  toggleTabsBtn.classList.toggle("active", tabsHidden);
  
  // Toggle visibility of all tab lists
  const tabLists = document.querySelectorAll(".tab-list");
  tabLists.forEach(list => {
    list.style.display = tabsHidden ? "none" : "";
  });
});

async function groupTabsAI(tabs) {
  const grouped = {
    "🎵 Music": [],
    "📚 Education": [],
    "🧬 Research": [],
    "💼 Work": [],
    "🎮 Entertainment": [],
    "🌐 Others": [],
    "🤖 AI": [],
    "🛒 Shopping": [],
    "👥 Social": [],
    "📰 News": [],
    "🏆 Sports": [],
    "💰 Finance": [],
    "🌤️ Weather": [],
    "🛫 Travel": [],
    "🏥 Health": [],
    "🎮 Gaming": [],
  };

  for (const tab of tabs) {
    const simpleCategory = await window.classifyTabAI(tab.title, tab.url);
    const category = mapCategoryToEmoji(simpleCategory);
    (grouped[category] || grouped["🌐 Others"]).push(tab);
  }
  return grouped;
}

// Map simple category to emoji-prefixed category
function mapCategoryToEmoji(cat) {
  switch (cat) {
    case "music": return "🎵 Music";
    case "education": return "📚 Education";
    case "research": return "🧬 Research";
    case "work": return "💼 Work";
    case "entertainment": return "🎮 Entertainment";
    case "ai": return "🤖 AI";
    case "AI": return "🤖 AI";
    case "shopping": return "🛒 Shopping";
    case "social": return "👥 Social";
    case "news": return "📰 News";
    case "sports": return "🏆 Sports";
    case "finance": return "💰 Finance";
    case "weather": return "🌤️ Weather";
    case "travel": return "🛫 Travel";
    case "health": return "🏥 Health";
    case "gaming": return "🎮 Gaming";
    case "others": return "🌐 Others";
    default: return "🌐 Others";
  }
}

function renderTabs(grouped, query = "") {
  const container = document.getElementById("categories");
  container.innerHTML = "";

  for (const [category, tabs] of Object.entries(grouped)) {
    const visibleTabs = query
      ? tabs.filter(t => (t.title || "").toLowerCase().includes(query))
      : tabs;
    if (visibleTabs.length === 0) continue;

    const section = document.createElement("div");
    section.className = "category";

    const header = document.createElement("div");
    header.className = "category-header";
    header.innerHTML = `<span class="cat-name">${category}</span><span class="badge">${visibleTabs.length}</span>`;

    const list = document.createElement("div");
    list.className = "tab-list";
    list.style.display = "none";

    visibleTabs.forEach(tab => {
      const itemContainer = document.createElement("div");
      itemContainer.className = "tab-item-container";
      
      const item = document.createElement("div");
      item.className = "tab-item";
      item.innerHTML = `<span class="title">${escapeHtml(tab.title || tab.url || "Untitled")}</span>`;
      item.addEventListener("click", () => {
        chrome.tabs.update(tab.id, { active: true });
      });
      
      // Create summary element that's always visible below the tab
      const summary = document.createElement("div");
      summary.className = "tab-summary";
      summary.setAttribute("data-tab-id", tab.id);
      summary.textContent = state.summariesByTabId[tab.id] || "Loading summary...";
      
      // Add to container
      itemContainer.appendChild(item);
      itemContainer.appendChild(summary);
      list.appendChild(itemContainer);
    });

    header.addEventListener("click", () => {
      list.style.display = list.style.display === "block" ? "none" : "block";
    });

    section.appendChild(header);
    section.appendChild(list);
    container.appendChild(section);
  }
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[c]);
}

function showTooltip(ev, tab) {
  const tooltip = document.getElementById("tooltip");
  const summary = state.summariesByTabId[tab.id] || "Fetching summary...";
  tooltip.textContent = summary;
  tooltip.style.display = "block";
  const rect = ev.currentTarget.getBoundingClientRect();
  tooltip.style.position = "fixed";
  tooltip.style.left = `${Math.round(rect.left)}px`;
  tooltip.style.top = `${Math.round(rect.bottom + 4)}px`;
  tooltip.style.maxWidth = "300px";
}

function hideTooltip() {
  const tooltip = document.getElementById("tooltip");
  tooltip.style.display = "none";
}

function showStatus(message, type = "info") {
  const status = document.getElementById("status");
  status.textContent = message;
  status.className = `status ${type}`;
  status.style.display = "block";
}

function hideStatus() {
  const status = document.getElementById("status");
  status.style.display = "none";
}

function preloadSummaries(tabs) {
  for (const tab of tabs) {
    // Ignore chrome:// and extension pages
    if (!tab.url || /^(chrome|edge|about|chrome-extension):/i.test(tab.url)) continue;

    // Set a loading placeholder
    state.summariesByTabId[tab.id] = "Loading summary...";
    
    // Update UI elements with this tab ID
    updateTabSummaryInUI(tab.id, "Loading summary...");
    
    // Make sure to retry if summary fails to load

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // Improved content extraction
        const meta = document.querySelector('meta[name="description"]');
        const og = document.querySelector('meta[property="og:description"]');
        const twitter = document.querySelector('meta[name="twitter:description"]');
        const h1 = document.querySelector('h1');
        const h2 = document.querySelector('h2');
        
        // Get first paragraph with substantial content
        let bestParagraph = "";
        const paragraphs = document.querySelectorAll('p');
        for (const p of paragraphs) {
          const text = p.innerText?.trim();
          if (text && text.length > 40) {
            bestParagraph = text;
            break;
          }
        }
        
        const text = [meta?.content, og?.content, twitter?.content, h1?.innerText, h2?.innerText, bestParagraph]
          .filter(Boolean)
          .join(". ");
        return text || document.title || location.hostname;
      },
    }, async (results) => {
      try {
        const raw = results && results[0] ? results[0].result : "";
        const summary = await window.summarizeExtractedText(raw);
        const finalSummary = summary || (tab.title || tab.url);
        
        // Store the summary
        state.summariesByTabId[tab.id] = finalSummary;
        
        // Update UI elements with this tab ID
        updateTabSummaryInUI(tab.id, finalSummary);
        // Persist summary for background overlay usage
        chrome.storage.local.set({ ["tab_summary_" + tab.id]: finalSummary });
      } catch (error) {
        console.error("Error generating summary:", error);
        state.summariesByTabId[tab.id] = tab.title || tab.url;
        updateTabSummaryInUI(tab.id, tab.title || tab.url);
        chrome.storage.local.set({ ["tab_summary_" + tab.id]: (tab.title || tab.url) });
      }
    });
  }
}

// Helper function to update summary elements in the UI
function updateTabSummaryInUI(tabId, summaryText) {
  const summaryElements = document.querySelectorAll(`.tab-summary[data-tab-id="${tabId}"]`);
  summaryElements.forEach(element => {
    element.textContent = summaryText;
  });
}

// Add this function to initialize tabs when popup opens
async function initializeTabs() {
  showStatus("Loading tabs...");
  try {
    const tabs = await chrome.tabs.query({});
    state.grouped = await groupTabsAI(tabs);
    renderTabs(state.grouped);
    preloadSummaries(tabs);
    hideStatus();
  } catch (error) {
    console.error("Error initializing tabs:", error);
    showStatus("Error loading tabs", "error");
  }
}

// Add this to run when the popup opens
document.addEventListener("DOMContentLoaded", initializeTabs);
