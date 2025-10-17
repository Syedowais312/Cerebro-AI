chrome.runtime.onInstalled.addListener(() => {
  console.log("Cerebro installed!");
  organizeAllTabs();
});

// Tab group configuration
// Remove collapsed: false from GROUP_CONFIG and cfg
const GROUP_CONFIG = {
  "🎵 Music": { color: "blue" },
  "📚 Education": { color: "green" },
  "🧬 Research": { color: "purple" },
  "💼 Work": { color: "orange" },
  "🎮 Entertainment": { color: "pink" },
  "🌐 Others": { color: "grey" },
  "🤖 AI": { color: "red" },
  "🛒 Shopping": { color: "yellow" },
  "👥 Social": { color: "grey" },
  "📰 News": { color: "blue" },
  "🏆 Sports": { color: "green" },
  "💰 Finance": { color: "purple" },
  "🌤️ Weather": { color: "orange" },
  "🛫 Travel": { color: "pink" },
  "🏥 Health": { color: "grey" }
};

async function organizeAllTabs() {
  const tabs = await pTabsQuery({});
  const grouped = await groupTabsAI(tabs);

  const existingGroups = await pTabGroupsQuery({});

  for (const [category, tabList] of Object.entries(grouped)) {
    if (tabList.length === 0) continue;

    const cfg = GROUP_CONFIG[category] || { color: "grey" };
    const existing = existingGroups.find(g => g.title === category);

    try {
      let groupId;
      if (existing) {
        groupId = existing.id;
        // Keep the existing collapsed state
        const currentGroup = await pTabGroupsQuery({id: groupId});
        const wasCollapsed = currentGroup[0]?.collapsed;
        await pTabGroupsUpdate(groupId, { title: category, color: cfg.color });
        if (wasCollapsed) {
          await pTabGroupsUpdate(groupId, { collapsed: true });
        }
      } else {
        // Create by grouping the first tab, then update
        groupId = await pTabsGroup({ tabIds: tabList[0].id });
        await pTabGroupsUpdate(groupId, { title: category, color: cfg.color, collapsed: true });
      }

      // Update title with count and add all tabs to the group
      await pTabGroupsUpdate(groupId, { title: `${category} (${tabList.length})` });
      const tabIds = tabList.map(t => t.id);
      await pTabsGroup({ groupId, tabIds });
    } catch (error) {
      console.log(`Could not organize group ${category}:`, error);
    }
  }
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
    const category = await classifyTab(tab.title, tab.url);
    (grouped[category] || grouped["🌐 Others"]).push(tab);
  }
  return grouped;
}

async function classifyTab(title, url) {
  // Import the ai.js script to use the same classification logic
  const text = `${title || ""} ${url || ""}`.toLowerCase();
  
  if (/(music|spotify|song|soundcloud|lyrics|bandcamp)/.test(text)) return "🎵 Music";
  if (/(learn|tutorial|course|udemy|coursera|khan|educat|class)/.test(text)) return "📚 Education";
  if (/(research|science|arxiv|paper|acm|ieee|pubmed)/.test(text)) return "🧬 Research";
  if (/(docs\.google|notion|slack|jira|github|gitlab|bitbucket)/.test(text)) return "💼 Work";
  if (/(youtube|netflix|movie|imdb|game|twitch|hulu|primevideo)/.test(text)) return "🎮 Entertainment";
  if (/(ai|artificial intelligence|chatgpt|openai|bard|claude|gemini|llm)/.test(text)) return "🤖 AI";
  if (/(shop|amazon|ebay|walmart|etsy|aliexpress|buy)/.test(text)) return "🛒 Shopping";
  if (/(twitter|x\.com|facebook|instagram|reddit|tiktok)/.test(text)) return "👥 Social";
  if (/(news|times|bbc|cnn|guardian|nytimes|reuters|bloomberg)/.test(text)) return "📰 News";
  if (/(sport|espn|nba|nfl|mlb|soccer|football|basketball)/.test(text)) return "🏆 Sports";
  if (/(finance|bank|money|invest|stock|crypto|trading)/.test(text)) return "💰 Finance";
  if (/(weather|forecast|climate|temperature)/.test(text)) return "🌤️ Weather";
  if (/(travel|flight|hotel|booking|airbnb|expedia|trip)/.test(text)) return "🛫 Travel";
  if (/(health|medical|doctor|hospital|clinic|wellness)/.test(text)) return "🏥 Health";
  if (/(game|gaming|steam|xbox|playstation|nintendo)/.test(text)) return "🎮 Gaming";
  
  return "🌐 Others";
}

// Listen for tab events to auto-organize
chrome.tabs.onCreated.addListener(async (tab) => {
  setTimeout(() => organizeAllTabs(), 1000); // Delay to let tab load
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    // Don't auto-organize on tab updates to prevent unwanted group expansion
    // setTimeout(() => organizeAllTabs(), 1000);
  }
});

chrome.tabs.onRemoved.addListener(async () => {
  setTimeout(() => organizeAllTabs(), 500);
});

// When a tab becomes active, show its summary overlay inside the page
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await new Promise(resolve => chrome.tabs.get(tabId, resolve));
    // Don't expand the group when tab becomes active
    const url = tab?.url || "";
    if (!url || /^(chrome|edge|about|chrome-extension):/i.test(url)) return;

    const key = "tab_summary_" + tabId;
    const store = await new Promise(resolve => chrome.storage.local.get([key], resolve));
    let summaryText = store[key];

    if (!summaryText) {
      const [result] = await new Promise(resolve => {
        chrome.scripting.executeScript({
          target: { tabId },
          func: () => {
            const meta = document.querySelector('meta[name="description"]');
            const og = document.querySelector('meta[property="og:description"]');
            const twitter = document.querySelector('meta[name="twitter:description"]');
            const h1 = document.querySelector('h1');
            const h2 = document.querySelector('h2');
            let bestParagraph = "";
            const paragraphs = document.querySelectorAll('p');
            for (const p of paragraphs) {
              const text = p.innerText?.trim();
              if (text && text.length > 40) { bestParagraph = text; break; }
            }
            const text = [meta?.content, og?.content, twitter?.content, h1?.innerText, h2?.innerText, bestParagraph]
              .filter(Boolean).join('. ');
            return text || document.title || location.hostname;
          },
        }, (res) => resolve(res || []));
      });
      const raw = result && result.result ? result.result : "";
      // Use Chrome Summarizer API if available; fallback otherwise
      summaryText = (await summarizeWithChromeAI(raw)) || tab.title || tab.url || "";
      chrome.storage.local.set({ [key]: summaryText });
    }

    chrome.tabs.sendMessage(tabId, { action: "showSummaryOverlay", summary: summaryText });
  } catch (err) {
    console.warn("onActivated overlay error:", err);
  }
});

// Lightweight summarizer (string-only, mirrors scripts/ai.js)
function summarizeExtractedText(raw) {
  if (!raw) return "";
  const text = raw.replace(/\s+/g, " ").replace(/[\r\n]+/g, " ").trim().slice(0, 1500);
  let summary = "";
  const descriptionMatch = text.match(/(?:about|description|summary)[:;\-]\s*([^\n\.]{10,150}[\.])/);
  if (descriptionMatch && descriptionMatch[1]) {
    summary = descriptionMatch[1].trim();
  } else {
    const sentences = text.split(/(?<=[.!?])\s+/);
    const goodSentences = sentences.filter(s => s.length > 30 && s.length < 150).slice(0, 2);
    summary = goodSentences.length > 0 ? goodSentences.join(" ") : sentences.slice(0, 3).join(" ");
  }
  return summary;
}

// Helper: Use Chrome Summarizer API if available, fallback to custom summarizer
async function summarizeWithChromeAI(raw) {
  if (!raw) return "";
  // Try Chrome Summarizer API
  if (chrome.summarize) {
    try {
      const result = await chrome.summarize({ text: raw });
      if (result && result.summary) return result.summary;
    } catch (e) {
      // API failed, fallback below
    }
  }
  // Fallback to custom summarizer
  if (typeof window !== "undefined" && window.summarizeExtractedText) {
    return await window.summarizeExtractedText(raw);
  }
  // Fallback: just truncate
  return raw.slice(0, 300);
}

// Update summarizeTabSmart handler
chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  if (msg && msg.action === "summarizeTabSmart" && msg.tabId) {
    try {
      const tabId = msg.tabId;
      const tab = await new Promise(resolve => chrome.tabs.get(tabId, resolve));
      if (!tab.url || /^(chrome|edge|about|chrome-extension):/i.test(tab.url)) {
        sendResponse({ success: false, summary: tab.title || tab.url });
        return true;
      }
      // Extract text from tab
      const [result] = await new Promise(resolve => {
        chrome.scripting.executeScript({
          target: { tabId },
          func: () => {
            const meta = document.querySelector('meta[name="description"]');
            const og = document.querySelector('meta[property="og:description"]');
            const twitter = document.querySelector('meta[name="twitter:description"]');
            const h1 = document.querySelector('h1');
            const h2 = document.querySelector('h2');
            let bestParagraph = "";
            const paragraphs = document.querySelectorAll('p');
            for (const p of paragraphs) {
              const text = p.innerText?.trim();
              if (text && text.length > 40) { bestParagraph = text; break; }
            }
            const text = [meta?.content, og?.content, twitter?.content, h1?.innerText, h2?.innerText, bestParagraph]
              .filter(Boolean).join('. ');
            return text || document.title || location.hostname;
          },
        }, (res) => resolve(res || []));
      });
      const raw = result && result.result ? result.result : "";
      const summary = await summarizeWithChromeAI(raw);
      sendResponse({ success: true, summary });
      return true;
    } catch (e) {
      sendResponse({ success: false, summary: "" });
      return true;
    }
  }
});

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.action === "getTabs") {
    chrome.tabs.query({}, (tabs) => sendResponse(tabs));
    return true;
  }
  if (req.action === "organizeTabs") {
    organizeAllTabs().then(() => sendResponse({ success: true })).catch((e) => {
      console.log("organizeTabs error", e);
      sendResponse({ success: false, error: String(e) });
    });
    return true;
  }
  if (req.action === "summarizeTab") {
    const { tabId } = req;
    chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const meta = document.querySelector('meta[name="description"]');
        const og = document.querySelector('meta[property="og:description"]');
        const h1 = document.querySelector('h1');
        const p = document.querySelector('p');
        const text = [meta?.content, og?.content, h1?.innerText, p?.innerText]
          .filter(Boolean)
          .join(". ");
        return text || document.title || location.hostname;
      },
    }, (results) => {
      const raw = results && results[0] ? results[0].result : "";
      sendResponse({ raw });
    });
    return true;
  }
  // Collapse or expand all tab groups in the browser
  if (req.action === "setGroupsCollapsed") {
    const collapsed = !!req.collapsed;
    chrome.tabGroups.query({}, (groups) => {
      let remaining = groups.length;
      if (remaining === 0) {
        sendResponse({ success: true, count: 0 });
        return;
      }
      groups.forEach((g) => {
        chrome.tabGroups.update(g.id, { collapsed }, () => {
          remaining -= 1;
          if (remaining === 0) sendResponse({ success: true, count: groups.length });
        });
      });
    });
    return true;
  }
  // Provide grouped tabs to the popup via background classifier
  if (req.action === "groupTabsSmart") {
    chrome.tabs.query({}, async (tabs) => {
      try {
        const grouped = await groupTabsAI(tabs);
        sendResponse({ success: true, grouped });
      } catch (e) {
        console.log("groupTabsSmart error", e);
        sendResponse({ success: false, error: String(e) });
      }
    });
    return true;
  }
  // Summarize a tab using background extraction and lightweight summarizer
  if (req.action === "summarizeTabSmart") {
    const { tabId } = req;
    chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const meta = document.querySelector('meta[name="description"]');
        const og = document.querySelector('meta[property="og:description"]');
        const twitter = document.querySelector('meta[name="twitter:description"]');
        const h1 = document.querySelector('h1');
        const h2 = document.querySelector('h2');
        let bestParagraph = "";
        const paragraphs = document.querySelectorAll('p');
        for (const p of paragraphs) {
          const text = p.innerText?.trim();
          if (text && text.length > 40) { bestParagraph = text; break; }
        }
        const text = [meta?.content, og?.content, twitter?.content, h1?.innerText, h2?.innerText, bestParagraph]
          .filter(Boolean)
          .join('. ');
        return text || document.title || location.hostname;
      },
    }, async (results) => {
      const raw = results && results[0] ? results[0].result : "";
      // Example: show summary overlay after summarizing
      if (tab && tab.id && tab.url && !/^(chrome|edge|about|chrome-extension):/i.test(tab.url)) {
        chrome.tabs.sendMessage(tab.id, { action: "showSummaryOverlay", summary }, (response) => {
          if (chrome.runtime.lastError) {
            // Optionally log or ignore the error
            // console.warn("Could not send message:", chrome.runtime.lastError.message);
          }
        });
      }
      const summary = await summarizeWithChromeAI(raw);
      sendResponse({ success: true, summary });
    });
    return true;
  }
});

// Promisified wrappers for Chrome callback APIs
function pTabsQuery(queryInfo) {
  return new Promise((resolve) => chrome.tabs.query(queryInfo, resolve));
}

function pTabGroupsQuery(queryInfo) {
  return new Promise((resolve) => chrome.tabGroups.query(queryInfo, resolve));
}

function pTabGroupsUpdate(groupId, updateProperties) {
  return new Promise((resolve, reject) => {
    chrome.tabGroups.update(groupId, updateProperties, (group) => {
      const err = chrome.runtime.lastError;
      if (err) reject(err);
      else resolve(group);
    });
  });
}

function pTabsGroup(options) {
  return new Promise((resolve, reject) => {
    chrome.tabs.group(options, (groupId) => {
      const err = chrome.runtime.lastError;
      if (err) reject(err);
      else resolve(groupId);
    });
  });
}

// Remove any automatic tab group expansion on tab activation
// Ensure tab groups remain collapsed unless user explicitly expands them
// If you have code like chrome.tabGroups.update(groupId, { collapsed: false }), remove or comment it out
function pTabsGroup(options) {
  return new Promise((resolve, reject) => {
    chrome.tabs.group(options, (groupId) => {
      const err = chrome.runtime.lastError;
      if (err) reject(err);
      else resolve(groupId);
    });
  });
}
