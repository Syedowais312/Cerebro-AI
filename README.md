# Cerebro-AI Chrome Extension

Cerebro-AI is a Chrome extension that uses AI to organize, summarize, and manage your browser tabs. It leverages Chrome's built-in Summarizer API (if available) and provides smart overlays, tooltips, and tab grouping features to enhance your browsing productivity.

## Features
- **AI Tab Summarization:** Automatically summarizes tab content using Chrome's Summarizer API or a custom fallback.
- **Smart Overlays:** Displays tab summaries as overlays when you hover over tab items or activate a tab.
- **Tab Grouping:** Organizes tabs into groups using AI-based classification.
- **Popup UI:** View, search, and manage tabs from a convenient popup interface.
- **Side Panel:** Additional tab management and summary features in a side panel.

## Installation
1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable "Developer mode" (top right).
4. Click "Load unpacked" and select the `cerebro-AI` folder.

## Usage
- Click the Cerebro-AI icon in your Chrome toolbar to open the popup.
- Hover over tab items to see AI-generated summaries as tooltips and overlays.
- Use the popup or side panel to organize, search, and group your tabs.

## Project Structure
```
├── background.js         # Background script for tab management and summarization
├── content\content.js    # Content script for displaying overlays
├── manifest.json         # Chrome extension manifest
├── popup\popup.js        # Popup UI logic
├── popup\popup.html      # Popup UI markup
├── popup\pop.css         # Popup UI styles
├── scripts\ai.js         # Custom AI summarization logic
├── sidepanel\panel.js    # Side panel logic
├── sidepanel\index.html  # Side panel markup
├── sidepanel\styles.css  # Side panel styles
└── icons\icon128.png     # Extension icon
```

## Requirements
- Chrome browser (Manifest V3 support recommended)
- (Optional) Chrome Summarizer API enabled for best results

## Development
- Edit scripts and UI files as needed.
- Reload the extension in `chrome://extensions` after making changes.

## License
MIT
