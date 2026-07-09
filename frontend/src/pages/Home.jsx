import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Chat from './Chat';
import { API_BASE_URL } from '../config';
import { 
  Bell, 
  User, 
  Trash2, 
  Plus, 
  TrendingUp, 
  FileText, 
  LogOut, 
  Calendar,
  History
} from 'lucide-react';

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [history, setHistory] = useState([]);
  const [activeReport, setActiveReport] = useState(null);
  const navigate = useNavigate();
  const [user,setUser] = useState("");
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
      const response = await axios.get(`${API_BASE_URL}/history`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setHistory(response.data.data || []);
      if (response.data.username) {
        setUser(response.data.username);
      }
    } catch (err) {
      console.error("Error fetching history:", err);
      if (err.response?.status === 401) {
        handleLogout();
      }
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm("Are you sure you want to delete this research report?")) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      await axios.delete(`${API_BASE_URL}/history/${reportId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // If the deleted report is currently opened, clear it
      if (activeReport?._id === reportId) {
        setActiveReport(null);
      }
      
      // Refresh the list
      fetchHistory(token);
    } catch (err) {
      console.error("Error deleting report:", err);
      alert(err.response?.data?.message || "Failed to delete report.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    setHistory([]);
    setActiveReport(null);
    navigate("/");
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#00C853]/10 flex items-center justify-center">
              <TrendingUp className="w-4.5 h-4.5 text-[#00C853]" strokeWidth={2.5} />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-[#111827]">Stockly</span>

            </div>
          </div>

          <div className="flex items-center gap-4">
          
            
            <div className="flex items-center gap-3">
              {/* Notification Mock */}
             

              {isLoggedIn ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg">
                    <User className="w-3.5 h-3.5 text-[#6B7280]" /> 
                    <span className="text-xs font-semibold text-[#111827]">{user || "Analyst"}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-[#6B7280] hover:text-red-600 border border-[#E5E7EB] hover:border-red-200 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    to="/login"
                    className="px-3.5 py-1.5 text-xs font-semibold text-[#6B7280] hover:text-[#111827] transition"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#111827] hover:bg-black rounded-lg transition duration-200 shadow-sm"
                  >
                    Create Account
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Welcome Banner */}
      <div className="max-w-7xl w-full mx-auto px-6 pt-6">
        <h1 className="text-2xl font-bold tracking-tight text-[#111827]">
          {isLoggedIn ? "Research Dashboard" : "Investment Research"}
        </h1>
        <p className="text-xs text-[#6B7280] mt-1 font-medium">
          {isLoggedIn 
            ? "Track your logs, view stock models, and run deep financial intelligence."
            : "Analyze any company with real-time intelligence and structured recommendations."}
        </p>
      </div>

      {/* Main Content Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row gap-6 p-6">
        
        {/* Left Sidebar - History List (only visible for logged-in users) */}
        {isLoggedIn && (
          <aside className="w-full md:w-80 bg-white rounded-2xl border border-[#E5E7EB] p-5 flex flex-col shadow-[0_1px_3px_rgba(0,0,0,0.05)] md:sticky md:top-24 h-fit">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#6B7280]" />
                <h2 className="font-bold text-[#111827] text-sm">Research Logs</h2>
              </div>
              <span className="text-xs bg-[#F3F4F6] text-[#6B7280] font-bold px-2 py-0.5 rounded-full border border-[#E5E7EB]">
                {history.length}
              </span>
            </div>

            <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[300px] md:max-h-[500px] pr-1">
              {history.length > 0 ? (
                history.map((report) => (
                  <div
                    key={report._id}
                    onClick={() => setActiveReport(report)}
                    className={`w-full text-left p-3 rounded-xl border transition duration-150 flex items-center justify-between gap-3 cursor-pointer group ${
                      activeReport?._id === report._id
                        ? 'border-[#E5E7EB] bg-[#F3F4F6] text-[#111827]'
                        : 'border-transparent hover:bg-[#F9FAFB] text-[#6B7280]'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <FileText className="w-4 h-4 mt-0.5 shrink-0 text-[#6B7280]" />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-xs text-[#111827] truncate">
                          {report.companyName}
                        </div>
                        <div className="text-[10px] text-[#6B7280] mt-0.5 font-medium">
                          {report.ticker} • {report.ticker === 'UNKNOWN' ? 'UNLISTED' : report.decision} • {report.confidenceScore}/10
                        </div>
                      </div>
                    </div>
                    {/* Delete button, visible on hover */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent opening the report
                        handleDeleteReport(report._id);
                      }}
                      className="text-[#6B7280] hover:text-[#EF4444] p-1 rounded hover:bg-[#E5E7EB] transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                      title="Delete log"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-[#6B7280] text-xs">No research history yet.</p>
                  <p className="text-[10px] text-[#6B7280] mt-1">Submit your first search query!</p>
                </div>
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
              <button
                onClick={() => setActiveReport(null)}
                className="w-full py-2 flex items-center justify-center gap-2 text-xs font-bold text-[#111827] hover:bg-[#F3F4F6] border border-[#E5E7EB] rounded-xl transition duration-150 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Analysis</span>
              </button>
            </div>
          </aside>
        )}

        {/* Right Main Panel - Search and Reports */}
        <main className="flex-1 min-w-0">
          <Chat 
            activeReport={activeReport} 
            onSearchInitiated={() => setActiveReport(null)}
            onNewResearchCompleted={() => fetchHistory()} 
          />
        </main>

      </div>
    </div>
  );
}
