chrome.runtime.onInstalled.addListener(() => {
  console.log("Cerebro installed!");
  organizeAllTabs();
});

// Tab group configuration
const GROUP_CONFIG = {
  "🎵 Music": { color: "blue", collapsed: false },
  "📚 Education": { color: "green", collapsed: false },
  "🧬 Research": { color: "purple", collapsed: false },
  "💼 Work": { color: "orange", collapsed: false },
  "🎮 Entertainment": { color: "pink", collapsed: false },
  "🌐 Others": { color: "grey", collapsed: false },
  "🤖 AI": { color: "red", collapsed: false },
  "🛒 Shopping": { color: "yellow", collapsed: false },
  "👥 Social": { color: "brown", collapsed: false },
  "📰 News": { color: "blue", collapsed: false },
  "🏆 Sports": { color: "green", collapsed: false },
  "💰 Finance": { color: "purple", collapsed: false },
  "🌤️ Weather": { color: "orange", collapsed: false },
  "🛫 Travel": { color: "pink", collapsed: false },
  "🏥 Health": { color: "grey", collapsed: false },
  
};

async function organizeAllTabs() {
  const tabs = await pTabsQuery({});
  const grouped = await groupTabsAI(tabs);

  const existingGroups = await pTabGroupsQuery({});

  for (const [category, tabList] of Object.entries(grouped)) {
    if (tabList.length === 0) continue;

    const cfg = GROUP_CONFIG[category] || { color: "grey", collapsed: false };
    const existing = existingGroups.find(g => g.title === category);

    try {
      let groupId;
      if (existing) {
        groupId = existing.id;
      } else {
        // Create by grouping the first tab, then update
        groupId = await pTabsGroup({ tabIds: tabList[0].id });
        await pTabGroupsUpdate(groupId, { title: category, color: cfg.color, collapsed: cfg.collapsed });
      }

      // Update title with count and collapse state; then add all tabs to the group
      await pTabGroupsUpdate(groupId, { title: `${category} (${tabList.length})`, color: cfg.color });
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
    setTimeout(() => organizeAllTabs(), 1000);
  }
});

chrome.tabs.onRemoved.addListener(async () => {
  setTimeout(() => organizeAllTabs(), 500);
});

// When a tab becomes active, show its summary overlay inside the page
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await new Promise(resolve => chrome.tabs.get(tabId, resolve));
    const url = tab?.url || "";
    if (!url || /^(chrome|edge|about|chrome-extension):/i.test(url)) return;

    // Try to fetch a cached summary
    const key = "tab_summary_" + tabId;
    const store = await new Promise(resolve => chrome.storage.local.get([key], resolve));
    let summaryText = store[key];

    // If no cached summary, extract and synthesize quickly
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
      summaryText = summarizeExtractedText(raw) || tab.title || tab.url || "";
      chrome.storage.local.set({ [key]: summaryText });
    }

    // Send message to content script to display
    chrome.tabs.sendMessage(tabId, { action: "showSummaryOverlay", summary: summaryText });
  } catch (err) {
    // Ignore errors (e.g., restricted pages)
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
