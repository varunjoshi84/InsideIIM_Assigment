import React, { useState, useEffect } from 'react';
import { v4 as uuid } from 'uuid';
import axios from 'axios';
import StockChart from './StockChart';
import { 
  Search, 
  Loader2, 
  TrendingUp, 
  Newspaper, 
  FileText, 
  AlertTriangle,
  ArrowUpRight
} from 'lucide-react';

export default function Chat({ activeReport, onSearchInitiated, onNewResearchCompleted }) {
  const [companyInput, setCompanyInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [localReport, setLocalReport] = useState(null);
  const [loadingStep, setLoadingStep] = useState(0);

  const formatPrice = (val) => {
    if (val === undefined || val === null || val === '') return '';
    const num = parseFloat(val);
    return isNaN(num) ? val : num.toFixed(2);
  };

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
    "Resolving company ticker registry symbol...",
    "Extracting real-time market snapshots and charts...",
    "Sourcing recent global market news and catalysts...",
    "Running LLM analysis to compile recommendations..."
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
    if (onSearchInitiated) {
      onSearchInitiated();
    }

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
        setError("Search limit reached. Please sign in to run more research reports.");
      } else {
        setError(err.response?.data?.message || "Failed to generate research. Please verify backend environment settings.");
      }
    } finally {
      setLoading(false);
    }
  };

  const parseInlineMarkdown = (text) => {
    if (!text) return '';
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const boldText = part.slice(2, -2);
        return <strong key={idx} className="font-bold text-[#111827]">{boldText}</strong>;
      }
      const subParts = part.split(/(\*.*?\*)/g);
      return subParts.map((subPart, subIdx) => {
        if (subPart.startsWith('*') && subPart.endsWith('*')) {
          return <em key={subIdx} className="italic text-[#6B7280]">{subPart.slice(1, -1)}</em>;
        }
        return subPart;
      });
    });
  };

  const formatAnalysis = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('###') || trimmed.startsWith('##') || trimmed.startsWith('#')) {
        const cleanLine = trimmed.replace(/^#+\s*/, '');
        return <h4 key={i} className="text-xs uppercase tracking-wider font-bold text-[#111827] mt-6 mb-2 border-b border-[#E5E7EB] pb-1">{parseInlineMarkdown(cleanLine)}</h4>;
      }
      
      const isBullet = /^[-*]\s+/.test(trimmed);
      if (isBullet) {
        const cleanLine = trimmed.replace(/^[-*]\s+/, '');
        return (
          <li key={i} className="ml-5 list-disc text-[#6B7280] text-sm my-1 font-medium">
            {parseInlineMarkdown(cleanLine)}
          </li>
        );
      }
      
      return trimmed === '' ? (
        <br key={i} />
      ) : (
        <p key={i} className="text-[#6B7280] text-sm leading-relaxed my-2 font-medium">
          {parseInlineMarkdown(line)}
        </p>
      );
    });
  };

  const priceHistory = report?.priceHistory || null;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Search Input Container */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <h2 className="text-lg font-bold text-[#111827] mb-1">Investment Research Center</h2>
        <p className="text-xs text-[#6B7280] mb-5 font-medium">
          Enter any company name or ticker (e.g. Reliance, Apple, Tata) to conduct financial snapshot lookups, parse media sentiment, and synthesize institutional recommendations.
        </p>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-[#6B7280]" />
            <input
              type="text"
              value={companyInput}
              onChange={(e) => setCompanyInput(e.target.value)}
              placeholder="Search company or ticker..."
              disabled={loading}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#E5E7EB] text-sm text-[#111827] placeholder-[#6B7280] bg-white outline-none focus:border-[#111827] transition-all disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-[#111827] hover:bg-black text-white text-sm font-semibold rounded-xl transition duration-150 disabled:opacity-60 flex items-center justify-center min-w-[120px] cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="animate-spin h-4.5 w-4.5 text-white" />
                <span>Analyzing...</span>
              </span>
            ) : "Analyze"}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Loading Skeleton States */}
      {loading && (
        <div className="space-y-6 animate-pulse">
          <div className="flex items-center gap-3 p-4 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl">
            <Loader2 className="w-4 h-4 text-[#6B7280] animate-spin" />
            <span className="text-xs font-semibold text-[#111827]">{loadingMessages[loadingStep]}</span>
          </div>

          {/* Skeleton Chart */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 h-[340px] flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
            <div className="space-y-2">
              <div className="h-3 bg-[#F3F4F6] rounded w-24"></div>
              <div className="h-5 bg-[#F3F4F6] rounded w-48"></div>
            </div>
            <div className="h-[200px] bg-[#F9FAFB] rounded-xl w-full border border-[#E5E7EB]"></div>
          </div>

          {/* Skeleton Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 md:col-span-2 space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <div className="h-4 bg-[#F3F4F6] rounded w-36"></div>
              <div className="grid grid-cols-3 gap-4">
                <div className="h-16 bg-[#F3F4F6] rounded-xl"></div>
                <div className="h-16 bg-[#F3F4F6] rounded-xl"></div>
                <div className="h-16 bg-[#F3F4F6] rounded-xl"></div>
              </div>
            </div>
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <div className="h-4 bg-[#F3F4F6] rounded w-28"></div>
              <div className="space-y-2">
                <div className="h-8 bg-[#F3F4F6] rounded-lg"></div>
                <div className="h-8 bg-[#F3F4F6] rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Dashboard */}
      {report && !loading ? (
        <div className="space-y-6">
          {/* Main Decision Banner (No Gradients) */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#6B7280]">AI Decision Engine</span>
                <h1 className="text-xl font-bold tracking-tight text-[#111827] mt-1">
                  {report.companyName} ({report.ticker})
                </h1>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Report generated on {new Date(report.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="block text-[9px] uppercase tracking-wider text-[#6B7280] font-bold">Recommendation</span>
                  {report.ticker === 'UNKNOWN' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mt-1 bg-[#6B7280]/10 text-[#6B7280] border border-[#6B7280]/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#6B7280]"></span>
                      UNLISTED
                    </span>
                  ) : (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mt-1 ${
                      report.decision === 'INVEST'
                        ? 'bg-[#16A34A]/10 text-[#16A34A] border border-[#16A34A]/20'
                        : 'bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${report.decision === 'INVEST' ? 'bg-[#16A34A]' : 'bg-[#EF4444]'}`}></span>
                      {report.decision}
                    </span>
                  )}
                </div>
                <div className="w-px h-8 bg-[#E5E7EB]"></div>
                <div className="text-right">
                  <span className="block text-[9px] uppercase tracking-wider text-[#6B7280] font-bold">Confidence</span>
                  <span className="text-xs font-bold text-[#111827] block mt-1 bg-[#F3F4F6] px-2.5 py-1 rounded-full border border-[#E5E7EB]">
                    {report.confidenceScore}/10
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-[#E5E7EB]">
              <h3 className="font-bold text-xs text-[#111827] uppercase tracking-wider mb-2">Key Recommendation Rationale</h3>
              <p className="text-[#6B7280] text-sm leading-relaxed font-medium">{report.reasoning}</p>
            </div>
          </div>

          {/* Price Chart */}
          {priceHistory && (
            <StockChart
              companyName={report.companyName}
              ticker={report.ticker}
              exchange={report.financials?.exchange || report.exchange || 'NSE'}
              currency={report.financials?.currency}
              history={priceHistory}
            />
          )}

          {/* Financials & Info Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Financial Metrics Card */}
            <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#E5E7EB] p-6 md:col-span-2">
              <h2 className="text-sm font-bold text-[#111827] mb-4 flex items-center gap-2 border-b border-[#E5E7EB] pb-2 uppercase tracking-wider">
                <TrendingUp className="h-4 w-4 text-[#6B7280]" />
                Market Financial Snapshot
              </h2>
              {report.financials && !report.financials.error ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl">
                    <span className="text-[10px] text-[#6B7280] font-bold uppercase block">Current Price</span>
                    <span className="text-lg font-bold text-[#111827] mt-0.5 block">
                      {report.financials.currentPrice ? `${formatPrice(report.financials.currentPrice)} ${report.financials.currency || 'USD'}` : 'N/A'}
                    </span>
                  </div>
                  <div className="p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl">
                    <span className="text-[10px] text-[#6B7280] font-bold uppercase block">Previous Close</span>
                    <span className="text-lg font-bold text-[#111827] mt-0.5 block">
                      {report.financials.previousClose ? `${formatPrice(report.financials.previousClose)} ${report.financials.currency || 'USD'}` : 'N/A'}
                    </span>
                  </div>
                  <div className="p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl">
                    <span className="text-[10px] text-[#6B7280] font-bold uppercase block">1-Month Return</span>
                    <span className={`text-lg font-bold block mt-0.5 ${
                      parseFloat(report.financials.oneMonthReturn) >= 0 ? 'text-[#16A34A]' : 'text-[#EF4444]'
                    }`}>
                      {report.financials.oneMonthReturn ? `${formatPrice(report.financials.oneMonthReturn)}%` : 'N/A'}
                    </span>
                  </div>
                  <div className="p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-[#6B7280] font-bold uppercase block">52-Week Range</span>
                    <span className="text-xs font-bold text-[#111827] block mt-1">
                      {report.financials.fiftyTwoWeekLow ? formatPrice(report.financials.fiftyTwoWeekLow) : 'N/A'} - {report.financials.fiftyTwoWeekHigh ? formatPrice(report.financials.fiftyTwoWeekHigh) : 'N/A'}
                    </span>
                  </div>
                  <div className="p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl col-span-2">
                    <span className="text-[10px] text-[#6B7280] font-bold uppercase block">Trading Volume</span>
                    <span className="text-sm font-bold text-[#111827] block mt-0.5">
                      {report.financials.volume ? report.financials.volume.toLocaleString() : 'N/A'}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-[#6B7280] text-xs font-medium">No real-time market data available (or company is private/unlisted).</p>
              )}
            </div>

            {/* Top Catalyst/News Card */}
            <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#E5E7EB] p-6 flex flex-col">
              <h2 className="text-sm font-bold text-[#111827] mb-4 flex items-center gap-2 border-b border-[#E5E7EB] pb-2 uppercase tracking-wider">
                <Newspaper className="h-4 w-4 text-[#6B7280]" />
                Market News Sources
              </h2>
              <div className="space-y-3 overflow-y-auto max-h-[160px] flex-1 pr-1">
                {report.news && report.news.length > 0 ? (
                  report.news.map((item, index) => (
                    <div key={index} className="text-xs border-b border-[#E5E7EB] pb-2.5 last:border-0 last:pb-0">
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#111827] hover:text-[#00C853] font-semibold line-clamp-2 flex items-center gap-1 transition-all"
                      >
                        <span>{item.title}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-[#6B7280] shrink-0" />
                      </a>
                      <span className="text-[#6B7280] text-[10px] mt-1.5 block font-medium">
                        {item.source} • {new Date(item.pubDate).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-[#6B7280] text-xs font-medium">No recent news publications extracted.</p>
                )}
              </div>
            </div>
          </div>

          {/* Full Investment Analysis Memo */}
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#E5E7EB] p-6">
            <h2 className="text-sm font-bold text-[#111827] mb-4 flex items-center gap-2 border-b border-[#E5E7EB] pb-2 uppercase tracking-wider">
              <FileText className="h-4 w-4 text-[#6B7280]" />
              In-Depth Investment Memo
            </h2>
            <div className="prose max-w-none">
              {formatAnalysis(report.analysis)}
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        !loading && (
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-12 text-center shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
            <Search className="h-10 w-10 text-[#6B7280]/40 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-[#111827]">No Research Report Loaded</h3>
            <p className="text-[#6B7280] text-xs max-w-xs mx-auto mt-1 font-medium">
              Enter a company name or ticker above to run a deep analysis, or select a log from history.
            </p>
          </div>
        )
      )}
    </div>
  );
}