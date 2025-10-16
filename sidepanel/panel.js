const state = {
  grouped: {},
  summariesByTabId: {},
  expandedByCategory: {},
  tabsHidden: false
};

async function init() {
  document.getElementById("search").addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    render(state.grouped, q);
  });
  
  // Add toggle tabs functionality
  const toggleTabsBtn = document.getElementById("toggleTabs");
  toggleTabsBtn.addEventListener("click", () => {
    state.tabsHidden = !state.tabsHidden;
    toggleTabsBtn.textContent = state.tabsHidden ? "Show Tabs" : "Hide Tabs";
    toggleTabsBtn.classList.toggle("active", state.tabsHidden);
    // Only toggle visibility of lists within the sidepanel UI
    // Update the UI based on the new state
    render(state.grouped, document.getElementById("search").value.trim().toLowerCase());
  });

  await refresh();

  chrome.tabs.onCreated.addListener(refresh);
  chrome.tabs.onRemoved.addListener(refresh);
  chrome.tabs.onUpdated.addListener((_id, _info, _tab) => refresh());
}

async function refresh() {
  const tabs = await queryTabs();
  state.grouped = await groupTabsAI(tabs);
  render(state.grouped, document.getElementById("search").value.trim().toLowerCase());
  preloadSummaries(tabs);
}

function queryTabs() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: "getTabs" }, (tabs) => resolve(tabs));
  });
}

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
    "🌐 Others": [],
  };

  for (const tab of tabs) {
    const categoryKey = await chooseCategory(tab);
    (grouped[categoryKey] || grouped["🌐 Others"]).push(tab);
  }
  return grouped;
}

async function chooseCategory(tab) {
  const cat = await window.classifyTabAI(tab.title, tab.url);
  switch (cat) {
    case "music": return "🎵 Music";
    case "education": return "📚 Education";
    case "research": return "🧬 Research";
    case "work": return "💼 Work";
    case "entertainment": return "🎮 Entertainment";
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
    case "other": return "🌐 Others";
    default: return "🌐 Others";
  }
}

function render(grouped, query = "") {
  const container = document.getElementById("categories");
  container.innerHTML = "";

  Object.entries(grouped).forEach(([category, tabs]) => {
    const visibleTabs = query ? tabs.filter(t => (t.title || "").toLowerCase().includes(query)) : tabs;
    if (visibleTabs.length === 0) return;

    const section = document.createElement("div");
    section.className = "category";

    const header = document.createElement("div");
    header.className = "category-header";
    header.innerHTML = `<span>${category}</span><span class="badge">${visibleTabs.length}</span>`;

    const list = document.createElement("div");
    list.className = "tab-list";
    const isExpanded = !!state.expandedByCategory[category];
    
    // If tabs are hidden, don't display the tab list at all
    if (state.tabsHidden) {
      list.style.display = "none";
    } else {
      list.style.display = "block";
      list.style.maxHeight = isExpanded ? `${visibleTabs.length * 40 + 12}px` : "0px";
    }
    
    // No-op for browser tab strip; extensions cannot hide/show native tabs

    visibleTabs.forEach(tab => {
      const itemContainer = document.createElement("div");
      itemContainer.className = "tab-item-container";
      
      const item = document.createElement("div");
      item.className = "tab-item";
      item.textContent = tab.title || tab.url || "Untitled";
      item.addEventListener("click", () => chrome.tabs.update(tab.id, { active: true }));
      
      // Add hover event listeners to show/hide tooltip with summary
      item.addEventListener("mouseenter", (e) => showTooltip(e, tab));
      item.addEventListener("mouseleave", () => hideTooltip());
      
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
      state.expandedByCategory[category] = !state.expandedByCategory[category];
      const expanded = state.expandedByCategory[category];
      list.style.maxHeight = expanded ? `${visibleTabs.length * 40 + 12}px` : "0px";
    });

    section.appendChild(header);
    section.appendChild(list);
    container.appendChild(section);
  });
}

function showTooltip(ev, tab) {
  const tooltip = document.getElementById("tooltip");
  const summary = state.summariesByTabId[tab.id] || "Fetching summary...";
  tooltip.textContent = summary;
  tooltip.style.display = "block";
  const rect = ev.currentTarget.getBoundingClientRect();
  
  // Position the tooltip below the tab item for better visibility
  tooltip.style.left = `${Math.round(rect.left)}px`;
  tooltip.style.top = `${Math.round(rect.bottom + 5)}px`;
  tooltip.style.zIndex = "1000";
  tooltip.style.opacity = "1";
  
  // Make sure tooltip doesn't go off-screen
  const tooltipRect = tooltip.getBoundingClientRect();
  if (tooltipRect.right > window.innerWidth) {
    tooltip.style.left = `${Math.round(window.innerWidth - tooltipRect.width - 10)}px`;
  }
}

function hideTooltip() {
  const tooltip = document.getElementById("tooltip");
  tooltip.style.display = "none";
}

function preloadSummaries(tabs) {
  for (const tab of tabs) {
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
      // Early exit on injection error to avoid stuck 'Loading summary...'
      if (chrome.runtime.lastError) {
        const fallback = tab.title || tab.url;
        console.error("Script injection failed:", chrome.runtime.lastError.message);
        state.summariesByTabId[tab.id] = fallback;
        updateTabSummaryInUI(tab.id, fallback);
        // Persist fallback summary for background overlay usage
        chrome.storage.local.set({ ["tab_summary_" + tab.id]: fallback });
        return;
      }

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

init();

