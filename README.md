# Stockly — AI Investment Research Desk

Stockly is an intelligent, institutional-grade equity research dashboard that compiles financial snapshots, crawls real-time press catalogs, analyzes market sentiments, and synthesizes binary investment recommendations (**INVEST** or **PASS**) powered by an autonomous multi-node LangGraph agent workflow.

---

## 🚀 Overview — What it Does

Stockly automates the workflow of a professional equity research analyst:
1. **Interactive Chat Input**: Accepts any company name or ticker query from the user.
2. **Ticker Resolution & Validation**: Automatically matches company names to official NSE/BSE tickers (`.NS`/`.BO`) or US tickers, filtering out fake/invalid inputs with clear syntax warnings.
3. **Market Metrics Snapshot**: Fetches current prices, previous closes, 52-week ranges, volume, and returns dynamically in the correct exchange currency (INR `₹` or USD `$`).
4. **Historical Price Charting**: Queries parallel timelines of Yahoo Finance data to render interactive, Groww-style price charts.
5. **Real-time Catalyst Crawl**: Crawls Google News feeds to parse current headlines and sentiments.
6. **AI Investment Memo**: Autonomously drafts an in-depth financial memo, risks outline, and provides a binary recommendation badge (`INVEST` or `PASS`), or neutral gray `UNLISTED` status for private companies (like Zerodha or OpenAI).
7. **Session Logs**: Saves authenticated logs to MongoDB, offering hoverable logs deletion and history tracking in the sidebar.

---

## 🛠️ How to Run It — Setup & Run Steps

### 1. Prerequisites
Ensure you have the following installed locally:
* [Node.js](https://nodejs.org/) (v18+ recommended)
* [MongoDB](https://www.mongodb.com/) (running locally on port `27017` or via MongoDB Atlas URI)

### 2. Environment Configuration
Create a `.env` file inside the `backend/` directory with the following variables:

```ini
PORT=5000
MONGO_URI=mongodb://localhost:27017/insideiim
JWT_SECRET="your_jwt_signing_secret"

# LLM API Keys (At least one must be set. Key fallback chain is configured automatically)
GEMINI_API_KEY="your_google_gemini_api_key"
OPENAI_API_KEY="your_openai_api_key_optional"
HUGGING_FACE_API_KEY="your_huggingface_api_key_optional"
```

### 3. Running the Backend Server
Navigate to the `backend/` folder, install dependencies, and start the node server:
```bash
cd backend
npm install
npm run dev   # Runs nodemon server on port 5000
```

### 4. Running the Frontend client
Navigate to the `frontend/` folder, install dependencies, and launch the Vite development server:
```bash
cd ../frontend
npm install
npm run dev   # Launches client on http://localhost:5173
```

---

## 🧠 How it Works — Approach & Architecture

Stockly implements an autonomous **LangGraph StateGraph** pipeline on the backend to execute the research steps sequentially:

* **`findTickerNode`**: Intercepts manual queries (e.g. `LTM` -> `LT.NS`) and instructs the LLM to format the query into a standard ticker format.
* **`fetchFinancialsNode`**: Requests market metrics metadata and exchange configurations directly from Yahoo Finance.
* **`fetchPriceHistoryNode`**: Pulls historical pricing ranges in parallel for multiple timeframes (`1D`, `1W`, `1M`, `3M`, `6M`, `1Y`, `5Y`).
* **`fetchNewsNode`**: Crawls Google News feeds to parse headlines.
* **`analyzeNode`**: Writes the executive summary, financial SWOT analysis, catalysts, and risk structures.
* **`decideNode`**: Summarizes the final recommendation, reasoning, and assigns a confidence score.

---

## ⚖️ Key Decisions & Trade-Offs

### What We Chose and Why:
* **LLM Fallback Wrapper (`FallbackChatModel`)**: Google's free tier of Gemini has strict daily quota limits (which return `429 Too Many Requests` errors). We built a custom fallback class. If Gemini blocks a request, the agent transparently falls back to OpenAI or a serverless Hugging Face provider (`Qwen/Qwen2.5-72B-Instruct`) to prevent service interruptions.
* **Strict Minimal UI (Stripe/Vercel Vibe)**: Avoided flashy animations, neon gradients, glassmorphism, and colorful cards. Designed a restrained, high-contrast dashboard with `#F8FAFC` backgrounds, thin `#E5E7EB` border lines, and clean inline SVG/Lucide iconography.
* **Dynamic Exchange Currencies**: Instead of hardcoding `₹` or `$`, the app parses metadata from Yahoo Finance and formats prices, ranges, and returns in the native trading currency of the stock exchange.
* **Unlisted Private Market Support**: Real private entities (e.g. Zerodha, OpenAI) resolve to `UNKNOWN` tickers and degrade gracefully. The app hides price snapshots but still delivers valuable crawled news and qualitative memos labeled under a neutral `UNLISTED` badge.

### What We Left Out (Trade-offs):
* **Real-time WebSocket Streaming**: We chose to fetch the entire graph state via REST. While WebSockets allow live node-by-node updates, REST endpoints kept database synchronization simple, reliable, and easily protected behind JWT middleware.

---

## 📝 Example Runs

### Case 1: Publicly Listed Stock (e.g. `"ltm"` / `"LTM"`)
* **Resolved Ticker**: `LT.NS` (Larsen & Toubro on NSE)
* **Market Price**: `₹3,981.10`
* **Decision Badge**: `INVEST` (Green Status)
* **Memo Summary**: Highlights L&T's infrastructure dominance and strategic pivot to digital high-margin gigawatt AI factories with Nvidia.

### Case 2: Private / Unlisted Company (e.g. `"zerodha"`)
* **Resolved Ticker**: `UNKNOWN`
* **Market Price**: `N/A` (Displays `"No real-time market data available (or company is private/unlisted)"`)
* **Decision Badge**: `UNLISTED` (Neutral Gray Status)
* **Memo Summary**: Compiles business operations, news of applying for a SEBI merchant banking license, and founders' energy transition investments.

### Case 3: Invalid Stock (e.g. `"InsideIIM"`)
* **Output**: Throws a clear user-friendly error message in the UI:
  > `"no stock name InsideIIM, please check syntax"`

---

## 🔮 Future Scope

In future versions, the platform will expand to include:
1. **Google OAuth Registration**: Integrated single-sign-on (SSO) to allow users to sign up and authenticate using Google Accounts.
2. **API Rate Limiting**: Advanced dynamic rate limiting using IP address mapping and JWT token limits to control high-volume agent usage.
3. **Subscription-Based Accounts**: Subscription tier integration to offer premium analytical features (unlimited reports, real-time alerts) for paid tiers.
4. **User Profile Settings**: Settings panel allowing users to edit profile information (names, emails) and perform GDPR-compliant account deletions directly from the dashboard.
