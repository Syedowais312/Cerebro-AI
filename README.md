# Chrome AI APIs Setup Instructions

## Prerequisites

1. **Chrome Version**: You need Chrome Canary or Chrome with experimental features enabled
2. **Chrome Flags**: Enable the following flags in Chrome:
   - Go to `chrome://flags/`
   - Search for and enable:
     - `#ai-writer-api`
     - `#ai-prompt-api`
     - `#ai-proofreader-api`
     - `#ai-summarizer-api`
     - `#ai-translator-api`
     - `#ai-language-detector-api`

3. **Restart Chrome** after enabling the flags

## Testing the Extension

1. **Load the Extension**:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select this folder

2. **Test API Availability**:
   - Click the Cerebro extension icon
   - Click "🔍 Check AI APIs" button
   - Check the console (F12) for detailed API status

3. **Expected Results**:
   - If APIs are available, you should see "APIs Available: prompt, summarizer, rewriter, translator, languageDetector"
   - If not available, you'll see "APIs Available: None"

## Troubleshooting

### If APIs are not detected:

1. **Check Chrome Version**: Make sure you're using Chrome Canary or the latest Chrome with experimental features
2. **Check Flags**: Ensure all AI-related flags are enabled
3. **Check Console**: Look for error messages in the browser console
4. **Origin Trial Tokens**: The tokens are embedded in the HTML files, but Chrome extensions may need additional configuration

### Alternative Testing:

If the Chrome AI APIs are not available, the extension will fall back to:
- Regex-based tab classification
- Text extraction summarization
- Basic translation/rewrite functionality

## Current Origin Trial Tokens

The extension includes these origin trial tokens:
- **Writer API**: For content rewriting
- **Prompt API**: For intelligent categorization  
- **Proofreader API**: For grammar checking

These tokens are embedded in the HTML files and should work when the Chrome AI APIs are properly enabled.
