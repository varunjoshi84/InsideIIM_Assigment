import React, { useState, useEffect } from 'react';
import { v4 as uuid } from 'uuid';
import axios from 'axios';

export default function Chat({ activeReport, onNewResearchCompleted }) {
  const [companyInput, setCompanyInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [localReport, setLocalReport] = useState(null);
  const [loadingStep, setLoadingStep] = useState(0);

  // Cycle loading messages for a premium feel while waiting for the LLM
  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % 4);
      }, 3000);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const loadingMessages = [
    "Analyzing company name and resolving stock ticker symbol...",
    "Querying Yahoo Finance for real-time price & historical performance...",
    "Extracting recent investment news articles from Google News...",
    "Running LangGraph agent nodes to synthesize report & recommendation..."
  ];

  // If activeReport is passed from parent (history), display it!
  const report = activeReport || localReport;

  let guestId = localStorage.getItem("guestId");
  if (!guestId) {
    guestId = uuid();
    localStorage.setItem("guestId", guestId);
  }

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!companyInput.trim()) return;

    setLoading(true);
    setError('');
    setLocalReport(null);

    const token = localStorage.getItem("token");
    const headers = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await axios.post(
        "http://127.0.0.1:5000/api/chat",
        {
          message: companyInput,
          guestId,
        },
        { headers }
      );

      setLocalReport(response.data.data);
      setCompanyInput('');
      if (onNewResearchCompleted) {
        onNewResearchCompleted();
      }
    } catch (err) {
      console.error(err);
      if (err.response?.status === 403) {
        setError("Guest search limit (3 searches) reached. Please register or login to perform unlimited searches.");
      } else {
        setError(err.response?.data?.message || "Failed to generate research. Please check that LLM API keys are set on the backend server.");
      }
    } finally {
      setLoading(false);
    }
  };

  const formatAnalysis = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      if (line.startsWith('###') || line.startsWith('##') || line.startsWith('#')) {
        const cleanLine = line.replace(/^#+\s*/, '');
        return <h3 key={i} className="text-lg font-bold text-slate-800 mt-5 mb-2 border-b pb-1">{cleanLine}</h3>;
      }
      if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
        const cleanLine = line.replace(/^[-*]\s*/, '');
        return <li key={i} className="ml-5 list-disc text-slate-600 my-1">{cleanLine}</li>;
      }
      return line.trim() === '' ? <br key={i} /> : <p key={i} className="text-slate-600 leading-relaxed my-1">{line}</p>;
    });
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4">
      {/* Search Input Container */}
      <div className="bg-white rounded-2xl shadow-md p-6 mb-6 border border-slate-100">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Investment Research Center</h2>
        <p className="text-slate-500 mb-6 text-sm">
          Enter any company name (e.g. Apple, Tesla, NVIDIA) to let the AI Research Agent conduct deep financials lookup, parse sentiment, and provide a final investment recommendation.
        </p>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={companyInput}
            onChange={(e) => setCompanyInput(e.target.value)}
            placeholder="Enter company name (e.g., Apple, NVIDIA, Google)..."
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 placeholder-slate-400 bg-slate-50 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition duration-200 disabled:bg-blue-400 flex items-center justify-center min-w-[120px]"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Researching...
              </span>
            ) : "Analyze"}
          </button>
        </form>

        {/* Loading Steps */}
        {loading && (
          <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-center gap-4 animate-pulse">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping"></div>
            <p className="text-blue-700 text-sm font-medium">{loadingMessages[loadingStep]}</p>
          </div>
        )}

        {/* Errors */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 rounded-xl border border-red-100 text-red-700 text-sm font-medium flex flex-col gap-2">
            <span>{error}</span>
            {error.includes("limit") && (
              <p className="text-xs text-red-500">Guests are limited to 3 searches to prevent API abuse. Register an account for unlimited requests.</p>
            )}
          </div>
        )}
      </div>

      {/* Report Dashboard */}
      {report ? (
        <div className="space-y-6">
          {/* Main Decision Banner */}
          <div className={`rounded-3xl p-6 shadow-sm border ${
            report.decision === 'INVEST' 
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 border-emerald-400 text-white' 
              : 'bg-gradient-to-r from-rose-500 to-amber-600 border-rose-400 text-white'
          }`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <span className="text-xs font-bold tracking-widest uppercase opacity-75">AI Decision Engine</span>
                <h1 className="text-3xl font-extrabold tracking-tight mt-1">
                  {report.companyName} ({report.ticker})
                </h1>
                <p className="text-sm opacity-90 mt-1">
                  Report generated on {new Date(report.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl">
                <div className="text-center">
                  <span className="block text-[10px] uppercase tracking-wider opacity-75">Decision</span>
                  <span className="text-2xl font-black">{report.decision}</span>
                </div>
                <div className="w-px h-10 bg-white/20"></div>
                <div className="text-center">
                  <span className="block text-[10px] uppercase tracking-wider opacity-75">Confidence</span>
                  <span className="text-2xl font-black">{report.confidenceScore}/10</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-white/20">
              <h3 className="font-bold text-lg mb-1">Key Recommendation Rationale</h3>
              <p className="text-white/90 text-sm leading-relaxed">{report.reasoning}</p>
            </div>
          </div>

          {/* Financials & Info Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Financial Metrics Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:col-span-2">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <svg className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                </svg>
                Market Financial Snapshot
              </h2>
              {report.financials && !report.financials.error ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Current Price</span>
                    <span className="text-xl font-bold text-slate-700">
                      {report.financials.currentPrice ? `${report.financials.currentPrice} ${report.financials.currency || 'USD'}` : 'N/A'}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Previous Close</span>
                    <span className="text-xl font-bold text-slate-700">
                      {report.financials.previousClose ? `${report.financials.previousClose} ${report.financials.currency || 'USD'}` : 'N/A'}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">1-Month Return</span>
                    <span className={`text-xl font-bold block ${
                      parseFloat(report.financials.oneMonthReturn) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {report.financials.oneMonthReturn ? `${report.financials.oneMonthReturn}%` : 'N/A'}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">52-Week Range</span>
                    <span className="text-sm font-bold text-slate-700 block mt-1">
                      {report.financials.fiftyTwoWeekLow || 'N/A'} - {report.financials.fiftyTwoWeekHigh || 'N/A'}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl col-span-2">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Trading Volume</span>
                    <span className="text-base font-bold text-slate-700">
                      {report.financials.volume ? report.financials.volume.toLocaleString() : 'N/A'}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 text-sm">No real-time market data available (or company is private/unlisted).</p>
              )}
            </div>

            {/* Top Catalyst/News Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <svg className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1M19 20a2 2 0 002-2V8a2 2 0 00-2-2h-5" />
                </svg>
                Market News Sources
              </h2>
              <div className="space-y-3 overflow-y-auto max-h-[160px] flex-1 pr-1">
                {report.news && report.news.length > 0 ? (
                  report.news.map((item, index) => (
                    <div key={index} className="text-xs border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-semibold line-clamp-2"
                      >
                        {item.title}
                      </a>
                      <span className="text-slate-400 text-[10px] mt-0.5 block">
                        {item.source} • {new Date(item.pubDate).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 text-sm">No recent news publications extracted.</p>
                )}
              </div>
            </div>
          </div>

          {/* Full Investment Analysis Memo */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2 border-b pb-2">
              <svg className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              In-Depth Investment Memo
            </h2>
            <div className="prose max-w-none">
              {formatAnalysis(report.analysis)}
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
          <svg className="h-12 w-12 text-slate-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-slate-600">No Research Report Loaded</h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto mt-2">
            Enter a company name above or select a historical research report from the list to view detailed analysis.
          </p>
        </div>
      )}
    </div>
  );
}
