const { StateGraph, Annotation } = require("@langchain/langgraph");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { ChatOpenAI } = require("@langchain/openai");
const { InferenceClient } = require("@huggingface/inference");
// Define state
const ResearchState = Annotation.Root({
  companyName: Annotation(),
  ticker: Annotation(),
  financials: Annotation(),
  priceHistory: Annotation(),
  news: Annotation(),
  analysis: Annotation(),
  decision: Annotation(),
  reasoning: Annotation(),
  confidenceScore: Annotation(),
  error: Annotation()
});
//Huggingface integration 
class HuggingFaceChatModel {
  constructor(apiKey) {
    this.client = new InferenceClient(apiKey);
    this.model = "Qwen/Qwen2.5-72B-Instruct";
  }

  async invoke(prompt) {
    const response = await this.client.chatCompletion({
      model: this.model,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 2048,
    });

    return {
      content: response.choices[0].message.content,
    };
  }
}
//model helper for gemini openai and hugging face
class FallbackChatModel {
  constructor(geminiModel, openaiModel, hfModel) {
    this.geminiModel = geminiModel;
    this.openaiModel = openaiModel;
    this.hfModel = hfModel;
  }

  async invoke(prompt) {
    if (this.geminiModel) {
      try {
        console.log("Using Gemini");
        const res = await this.geminiModel.invoke(prompt);
        return res;
      } catch (err) {
        console.warn("Gemini call failed or rate-limited. Error:", err.message);
        if (!this.openaiModel && !this.hfModel) {
          throw err;
        }
      }
    }
    
    if (this.openaiModel) {
      try {
        console.log("Using OpenAI Fallback");
        const res = await this.openaiModel.invoke(prompt);
        return res;
      } catch (err) {
        console.warn("OpenAI call failed. Error:", err.message);
        if (!this.hfModel) {
          throw err;
        }
      }
    }

    if (this.hfModel) {
      console.log("Using Hugging Face Fallback (Qwen 2.5)");
      const res = await this.hfModel.invoke(prompt);
      return res;
    }

    throw new Error("No model was able to resolve this request.");
  }
}

//model helper for gemini openai and hugging face
function getModel() {
  let geminiModel = null;
  let openaiModel = null;
  let hfModel = null;

  if (process.env.GEMINI_API_KEY) {
    geminiModel = new ChatGoogleGenerativeAI({
      model: "gemini-3.5-flash",
      maxOutputTokens: 2048,
      apiKey: process.env.GEMINI_API_KEY,
    });
  }

  if (process.env.OPENAI_API_KEY) {
    openaiModel = new ChatOpenAI({
      model: "gpt-4o-mini",
      maxTokens: 2048,
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  if (process.env.HUGGING_FACE_API_KEY) {
    hfModel = new HuggingFaceChatModel(process.env.HUGGING_FACE_API_KEY);
  }

  if (!geminiModel && !openaiModel && !hfModel) {
    throw new Error("No LLM API key found.");
  }

  return new FallbackChatModel(geminiModel, openaiModel, hfModel);
}

// Node 1: Resolve Ticker
async function findTickerNode(state) {
  const { companyName } = state;
  
  const cleanName = companyName.trim().toUpperCase();
  if (cleanName === "LTM" || cleanName === "LTM.NSE") {
    console.log(`Manual override: Resolved LTM query to LT.NS`);
    return { ticker: "LT.NS" };
  }

  try {
    const model = getModel();
    const prompt = `You are an experienced equity research analyst.
Task: Given the company name or search query "${companyName}", resolve it to its primary publicly traded stock ticker symbol.
Rules:
- Return ONLY the ticker symbol in uppercase.
- If the company is primarily listed in India (e.g. Reliance, Tata, TARC, Adani, Zomato, etc.), you MUST append the ".NS" suffix to the ticker symbol (e.g. RELIANCE.NS, TCS.NS, TARC.NS, ZOMATO.NS).
- If it is a US stock (e.g. Apple, Google, Microsoft), return the standard US ticker without any suffix (e.g. AAPL, GOOG, MSFT).
- Return ONLY the ticker symbol, with no other text, markdown, or punctuation. If you cannot identify the ticker, reply with "UNKNOWN".`;
    
    const response = await model.invoke(prompt);
    const ticker = response.content.toString().trim().toUpperCase().replace(/[^A-Z.]/g, '');
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
      exchange: meta.exchangeName || "NSE",
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

async function fetchHistoryForPeriod(ticker, range, interval) {
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=${range}&interval=${interval}`);
    if (!res.ok) return [];
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return [];
    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0]?.close || [];
    
    return timestamps.map((ts, idx) => {
      const date = new Date(ts * 1000);
      let dateStr;
      if (range === '1d') {
        dateStr = date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
      } else if (range === '5d' || range === '1mo') {
        dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      } else {
        dateStr = date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      }
      return {
        date: dateStr,
        price: quotes[idx] != null ? Number(quotes[idx].toFixed(2)) : null
      };
    }).filter(pt => pt.price !== null);
  } catch (err) {
    console.error(`Error fetching period ${range} for ${ticker}:`, err);
    return [];
  }
}

async function fetchPriceHistoryNode(state) {
  const { ticker } = state;
  if (!ticker || ticker === "UNKNOWN") {
    return { priceHistory: {} };
  }

  try {
    console.log(`Fetching parallel price history for: ${ticker}`);
    const [h1d, h1w, h1m, h3m, h6m, h1y, h5y] = await Promise.all([
      fetchHistoryForPeriod(ticker, '1d', '5m'),
      fetchHistoryForPeriod(ticker, '5d', '15m'),
      fetchHistoryForPeriod(ticker, '1mo', '1d'),
      fetchHistoryForPeriod(ticker, '3mo', '1d'),
      fetchHistoryForPeriod(ticker, '6mo', '1d'),
      fetchHistoryForPeriod(ticker, '1y', '1d'),
      fetchHistoryForPeriod(ticker, '5y', '1wk'),
    ]);

    const priceHistory = {
      '1D': h1d,
      '1W': h1w,
      '1M': h1m,
      '3M': h3m,
      '6M': h6m,
      '1Y': h1y,
      '3Y': h5y.slice(-156), // last 3 years of weekly data
      '5Y': h5y,
      'All': h5y // fallback to 5y
    };

    return { priceHistory };
  } catch (err) {
    console.error("Error in fetchPriceHistoryNode:", err);
    return { priceHistory: {} };
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
  
  const isTickerUnknown = !ticker || ticker === "UNKNOWN";
  const hasNoNews = !news || news.length === 0;

  if (isTickerUnknown && hasNoNews) {
    console.log(`Aborting analysis: no ticker or news found for "${companyName}"`);
    return {
      analysis: `### Aborted: Entity Not Found\n\nWe could not find any publicly traded stock ticker symbol, historical price chart, or recent news reports for the company name **"${companyName}"**.\n\nPlease verify that the company name is spelled correctly and that the business is a publicly listed or widely recognized entity.`
    };
  }

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

  if (analysis && analysis.includes("Aborted: Entity Not Found")) {
    return {
      decision: "PASS",
      reasoning: `We were unable to identify "${companyName}" as a valid publicly traded company or find any public news history.`,
      confidenceScore: 10
    };
  }

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
  .addNode("fetchPriceHistory", fetchPriceHistoryNode)
  .addNode("fetchNews", fetchNewsNode)
  .addNode("analyze", analyzeNode)
  .addNode("decide", decideNode);

workflow.addEdge("__start__", "findTicker");
workflow.addEdge("findTicker", "fetchFinancials");
workflow.addEdge("fetchFinancials", "fetchPriceHistory");
workflow.addEdge("fetchPriceHistory", "fetchNews");
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
