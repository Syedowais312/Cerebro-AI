async function classifyTabAI(title, url) {
  const text = `${title || ""} ${url || ""}`.toLowerCase();

  if (/(music|spotify|song|soundcloud|lyrics|bandcamp)/.test(text)) return "music";
  if (/(learn|tutorial|course|udemy|coursera|khan|educat|class)/.test(text)) return "education";
  if (/(research|science|arxiv|paper|acm|ieee|pubmed)/.test(text)) return "research";
  if (/(youtube|netflix|movie|imdb|game|twitch|hulu|primevideo)/.test(text)) return "entertainment";
  if (/(news|times|bbc|cnn|guardian|nytimes|reuters|bloomberg)/.test(text)) return "news";
  if (/(docs\.google|notion|slack|jira|github|gitlab|bitbucket)/.test(text)) return "work";
  if (/(twitter|x\.com|facebook|instagram|reddit|tiktok)/.test(text)) return "social";

  return "others";
}

async function summarizeExtractedText(raw) {
  if (!raw) return "";
  
  // Clean up the text
  const text = raw
    .replace(/\s+/g, " ")
    .replace(/[\r\n]+/g, " ")
    .trim()
    .slice(0, 1500);
  
  // Extract meaningful content
  let summary = "";
  
  // Try to get a description or main content
  const descriptionMatch = text.match(/(?:about|description|summary)[:;\-]\s*([^\n\.]{10,150}[\.])/);
  if (descriptionMatch && descriptionMatch[1]) {
    summary = descriptionMatch[1].trim();
  } else {
    // Extract first few sentences, prioritizing longer ones that are likely more informative
    const sentences = text.split(/(?<=[.!?])\s+/);
    const goodSentences = sentences
      .filter(s => s.length > 30 && s.length < 150)
      .slice(0, 2);
      
    if (goodSentences.length > 0) {
      summary = goodSentences.join(" ");
    } else {
      // Fallback to first few sentences
      summary = sentences.slice(0, 3).join(" ");
    }
  }
  
  return summary;
}

// Export to window for popup usage
window.classifyTabAI = classifyTabAI;
window.summarizeExtractedText = summarizeExtractedText;
