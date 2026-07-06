import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Chat from './Chat';

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [history, setHistory] = useState([]);
  const [activeReport, setActiveReport] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsLoggedIn(true);
      fetchHistory(token);
    }
  }, []);

  const fetchHistory = async (customToken) => {
    const token = customToken || localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await axios.get("http://127.0.0.1:5000/api/history", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setHistory(response.data.data || []);
    } catch (err) {
      console.error("Error fetching history:", err);
      if (err.response?.status === 401) {
        handleLogout();
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    setHistory([]);
    setActiveReport(null);
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-extrabold text-lg shadow-md shadow-blue-200">
              F
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-slate-800">FinTrack</span>
              <span className="font-bold text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded ml-1.5">AI</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-slate-600 hidden sm:inline-block">Research Premium</span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-semibold text-red-600 hover:text-white border border-red-200 hover:bg-red-600 rounded-xl transition duration-200 cursor-pointer"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-xl font-medium border border-amber-200 mr-2 hidden sm:inline-block">
                  Guest Tier (3 Searches)
                </span>
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition duration-200 shadow-sm shadow-blue-100"
                >
                  Create Account
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row gap-6 p-6">
        
        {/* Left Sidebar - History List (only visible for logged-in users) */}
        {isLoggedIn && (
          <aside className="w-full md:w-80 bg-white rounded-2xl border border-slate-200 p-5 flex flex-col shadow-sm md:sticky md:top-24 h-fit">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <h2 className="font-bold text-slate-800 text-base">Your Research Logs</h2>
              <span className="text-xs bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full">
                {history.length}
              </span>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto max-h-[300px] md:max-h-[500px] pr-1">
              {history.length > 0 ? (
                history.map((report) => (
                  <button
                    key={report._id}
                    onClick={() => setActiveReport(report)}
                    className={`w-full text-left p-3 rounded-xl border transition duration-200 flex items-start gap-3 cursor-pointer ${
                      activeReport?._id === report._id
                        ? 'border-blue-500 bg-blue-50/50'
                        : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full mt-1.5 shrink-0 ${
                      report.decision === 'INVEST' ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}></span>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm text-slate-800 truncate">
                        {report.companyName}
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        {report.ticker} • {report.decision} • Score {report.confidenceScore}/10
                      </div>
                      <div className="text-[9px] text-slate-400 mt-1">
                        {new Date(report.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-400 text-xs">No research history yet.</p>
                  <p className="text-[10px] text-slate-400 mt-1">Submit your first search query!</p>
                </div>
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-100">
              <button
                onClick={() => setActiveReport(null)}
                className="w-full py-2.5 text-center text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition duration-200 cursor-pointer"
              >
                Run New Analysis
              </button>
            </div>
          </aside>
        )}

        {/* Right Main Panel - Search and Reports */}
        <main className="flex-1 min-w-0">
          <Chat 
            activeReport={activeReport} 
            onNewResearchCompleted={() => fetchHistory()} 
          />
        </main>

      </div>
    </div>
  );
}
