const { StateGraph, Annotation } = require("@langchain/langgraph");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { ChatOpenAI } = require("@langchain/openai");
const { HuggingFaceInference } = require("@langchain/huggingface");
// Define state
const ResearchState = Annotation.Root({
  companyName: Annotation(),
  ticker: Annotation(),
  financials: Annotation(),
  news: Annotation(),
  analysis: Annotation(),
  decision: Annotation(),
  reasoning: Annotation(),
  confidenceScore: Annotation(),
  error: Annotation()
});

// Model helper supporting both Gemini and OpenAI
function getModel() {
  if (process.env.GEMINI_API_KEY) {
    console.log("Using Gemini model for research agent");
    return new ChatGoogleGenerativeAI({
      modelName: "gemini-1.5-flash",
      maxOutputTokens: 2048,
      apiKey: process.env.GEMINI_API_KEY
    });
  } else if (process.env.OPENAI_API_KEY) {
    console.log("Using OpenAI model for research agent");
    return new ChatOpenAI({
      modelName: "gpt-4o-mini",
      maxTokens: 2048,
      apiKey: process.env.OPENAI_API_KEY
    });
  } else if(process.env.HUGGING_FACE_API_KEY){
    console.log("Using Hugging Face model for reseach agent");
    return new HuggingFaceInference({
      modelName: "meta-llama/Llama-3.1-8B-Instruct",
      apiKey: process.env.HUGGING_FACE_API_KEY
    })
  }   
   else {
    throw new Error("No LLM API keys found. Please configure GEMINI_API_KEY or OPENAI_API_KEY in your backend/.env file.");
  }
}

// Node 1: Resolve Ticker
async function findTickerNode(state) {
  const { companyName } = state;
  try {
    const model = getModel();
   const prompt = `You are an experienced equity research analyst.
   Task:Given the company name "${companyName}", determine the primary publicly traded stock ticker symbol.
  Rules:
  - Return ONLY the ticker symbol in uppercase (e.g., AAPL, MSFT, TSLA, RELIANCE, TCS).
  - If multiple listed companies share the same name, return the ticker of the most widely recognized publicly traded company.
  - If the company is privately held, delisted, or no reliable ticker can be identified, return "UNKNOWN".
  - Do not include exchange names, explanations, punctuation, markdown, or any additional text.
  Output:
  <TICKER>
  `;
    
    const response = await model.invoke(prompt);
    const ticker = response.content.toString().trim().toUpperCase().replace(/[^A-Z]/g, '');
    console.log(`Resolved ticker for "${companyName}": ${ticker}`);
    return { ticker };
  } catch (err) {
    console.error("Error resolving ticker:", err);
    return { ticker: "UNKNOWN", error: `Ticker resolution failed: ${err.message}` };
  }
}

// Node 2: Fetch Financials from Yahoo Finance
async function fetchFinancialsNode(state) {
  const { ticker } = state;
  if (!ticker || ticker === "UNKNOWN") {
    return { financials: { error: "No valid ticker for financial data lookup." } };
  }

  try {
    console.log(`Fetching Yahoo Finance chart data for ticker: ${ticker}`);
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=1mo&interval=1d`);
    if (!res.ok) {
      return { financials: { error: `Failed to fetch from Yahoo Finance (status ${res.status})` } };
    }
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) {
      return { financials: { error: "No chart data found for this symbol." } };
    }

    const meta = result.meta || {};
    const closePrices = result.indicators?.quote?.[0]?.close || [];
    const validClosePrices = closePrices.filter(p => p !== null && p !== undefined);

    const currentPrice = meta.regularMarketPrice || validClosePrices[validClosePrices.length - 1];
    const previousClose = meta.previousClose || validClosePrices[0];
    const fiftyTwoWeekHigh = meta.fiftyTwoWeekHigh;
    const fiftyTwoWeekLow = meta.fiftyTwoWeekLow;

    let oneMonthReturn = 0;
    if (validClosePrices.length > 1) {
      const first = validClosePrices[0];
      const last = validClosePrices[validClosePrices.length - 1];
      oneMonthReturn = ((last - first) / first) * 100;
    }

    const financials = {
      longName: meta.longName || ticker,
      symbol: ticker,
      currentPrice,
      previousClose,
      fiftyTwoWeekHigh,
      fiftyTwoWeekLow,
      volume: meta.regularMarketVolume,
      currency: meta.currency,
      oneMonthReturn: Number(oneMonthReturn.toFixed(2)),
      priceHistory: validClosePrices.slice(-10)
    };

    console.log(`Financials fetched successfully for: ${ticker}`);
    return { financials };
  } catch (err) {
    console.error("Error in fetchFinancialsNode:", err);
    return { financials: { error: `Error fetching financials: ${err.message}` } };
  }
}

// Node 3: Fetch news articles from Google News RSS feed
async function fetchNewsNode(state) {
  const { companyName, ticker } = state;
  try {
    const searchQuery = `${companyName} ${ticker && ticker !== "UNKNOWN" ? ticker : ""} stock news investment`;
    console.log(`Fetching Google News articles for query: "${searchQuery}"`);
    const encoded = encodeURIComponent(searchQuery);
    
    const res = await fetch(`https://news.google.com/rss/search?q=${encoded}&hl=en-US&gl=US&ceid=US:en`);
    if (!res.ok) {
      return { news: [] };
    }
    const xml = await res.text();

    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null && items.length < 6) {
      const itemContent = match[1];
      const titleMatch = itemContent.match(/<title>([\s\S]*?)<\/title>/);
      const linkMatch = itemContent.match(/<link>([\s\S]*?)<\/link>/);
      const pubDateMatch = itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      const sourceMatch = itemContent.match(/<source[\s\S]*?>([\s\S]*?)<\/source>/);

      items.push({
        title: titleMatch ? titleMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, '$1') : '',
        link: linkMatch ? linkMatch[1] : '',
        pubDate: pubDateMatch ? pubDateMatch[1] : '',
        source: sourceMatch ? sourceMatch[1] : ''
      });
    }

    console.log(`Fetched ${items.length} news items.`);
    return { news: items };
  } catch (err) {
    console.error("Error fetching news:", err);
    return { news: [], error: `Failed to fetch news: ${err.message}` };
  }
}

// Node 4: Compile analysis memo
async function analyzeNode(state) {
  const { companyName, ticker, financials, news } = state;
  try {
    const model = getModel();
    const isFinValid = financials && !financials.error;
    const isNewsValid = news && news.length > 0;

    const financialsStr = isFinValid ? JSON.stringify(financials, null, 2) : "No financial metrics available.";
    const newsStr = isNewsValid ? news.map(n => `- [${n.source}] ${n.title} (${n.pubDate})`).join('\n') : "No recent news available.";

    const prompt = `You are a Senior Investment Analyst. Write a comprehensive, objective investment research report for:
Company Name: ${companyName}
Ticker: ${ticker || "UNKNOWN"}

Financial Data:
${financialsStr}

Recent News & Press:
${newsStr}

Please structure your report using standard Markdown, including headings, lists, and bold text for scanning. Include the following sections:
1. ### Executive Summary: High-level overview of the company, its current status, and the initial sentiment.
2. ### Financial Health & Valuation: Interpret the current price (${financials?.currentPrice || 'N/A'}), 1-month return (${financials?.oneMonthReturn || 'N/A'}%), 52-week range (${financials?.fiftyTwoWeekLow || 'N/A'} to ${financials?.fiftyTwoWeekHigh || 'N/A'}), and trade volume.
3. ### Market Position & Catalysts: Analyze the news articles and sentiment. What are the key growth drivers and near-term catalysts?
4. ### Investment Risks: Outline key competitive, regulatory, technological, or market risks.
5. ### Analyst Conclusion: Synthesis of potential returns versus risks.`;

    console.log(`Generating investment analysis report for: ${companyName}`);
    const response = await model.invoke(prompt);
    return { analysis: response.content.toString() };
  } catch (err) {
    console.error("Error in analyzeNode:", err);
    return { analysis: "Analysis generation failed due to model error.", error: `Analysis node error: ${err.message}` };
  }
}

// Node 5: Investment Decision Committee
async function decideNode(state) {
  const { companyName, ticker, financials, analysis } = state;
  try {
    const model = getModel();
    const prompt = `You are the Investment Committee. You must review the financial data and the analysis memo, then make a final, binary decision: **INVEST** or **PASS**.

Company: ${companyName} (${ticker})
Price: ${financials?.currentPrice || 'N/A'}

Analysis Report:
${analysis}

Provide your decision in clean JSON format. DO NOT write any pre-text, post-text, or markdown formatting fences. The output must be valid JSON only.
Structure:
{
  "decision": "INVEST" or "PASS" (must be exactly one of these strings in uppercase),
  "reasoning": "A concise explanation (2-3 sentences max) explaining the principal justification for this decision.",
  "confidenceScore": (integer between 1 and 10, representing confidence in this decision)
}`;

    console.log(`Generating final investment decision for: ${companyName}`);
    const response = await model.invoke(prompt);
    
    let cleanContent = response.content.toString().trim();
    if (cleanContent.startsWith("```json")) {
      cleanContent = cleanContent.substring(7);
    }
    if (cleanContent.startsWith("```")) {
      cleanContent = cleanContent.substring(3);
    }
    if (cleanContent.endsWith("```")) {
      cleanContent = cleanContent.substring(0, cleanContent.length - 3);
    }
    cleanContent = cleanContent.trim();

    const decisionObj = JSON.parse(cleanContent);
    return {
      decision: decisionObj.decision === "INVEST" ? "INVEST" : "PASS",
      reasoning: decisionObj.reasoning || "No reasoning provided.",
      confidenceScore: decisionObj.confidenceScore || 5
    };
  } catch (err) {
    console.error("Error in decideNode:", err);
    return {
      decision: "PASS",
      reasoning: `Failed to make a decision through LLM: ${err.message}`,
      confidenceScore: 0
    };
  }
}

// Assemble the workflow
const workflow = new StateGraph(ResearchState)
  .addNode("findTicker", findTickerNode)
  .addNode("fetchFinancials", fetchFinancialsNode)
  .addNode("fetchNews", fetchNewsNode)
  .addNode("analyze", analyzeNode)
  .addNode("decide", decideNode);

workflow.addEdge("__start__", "findTicker");
workflow.addEdge("findTicker", "fetchFinancials");
workflow.addEdge("fetchFinancials", "fetchNews");
workflow.addEdge("fetchNews", "analyze");
workflow.addEdge("analyze", "decide");
workflow.addEdge("decide", "__end__");

const researchAgentGraph = workflow.compile();

async function runResearchAgent(companyName) {
  try {
    const initialState = { companyName };
    const finalState = await researchAgentGraph.invoke(initialState);
    return finalState;
  } catch (err) {
    console.error("Error executing LangGraph research agent workflow:", err);
    throw err;
  }
}

module.exports = {
  runResearchAgent
};
