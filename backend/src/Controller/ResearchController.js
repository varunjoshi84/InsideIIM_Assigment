const { runResearchAgent } = require('../services/researchAgent');
const Research = require('../models/Research.model');
const User = require('../models/User.model.js');

const executeResearch = async (req, res) => {
    const { message, guestId } = req.body;
    if (!message || message.trim() === "") {
        return res.status(400).json({
            message: "Company name (message) is required."
        });
    }

    try {
        const agentResult = await runResearchAgent(message);

        // Check if the company could not be found
        const isTickerUnknown = !agentResult.ticker || agentResult.ticker === "UNKNOWN";
        const hasNoNews = !agentResult.news || agentResult.news.length === 0;
        if (isTickerUnknown && hasNoNews) {
            return res.status(400).json({
                message: `no stock name ${message}, please check syntax`
            });
        }

        // Save report to database
        const researchReport = await Research.create({
            userId: req.user ? req.user.id : null,
            guestId: req.user ? null : (guestId || null),
            companyName: agentResult.companyName || message,
            ticker: agentResult.ticker || "UNKNOWN",
            financials: agentResult.financials || {},
            news: agentResult.news || [],
            priceHistory: agentResult.priceHistory || {},
            analysis: agentResult.analysis || "No analysis generated.",
            decision: agentResult.decision || "PASS",
            reasoning: agentResult.reasoning || "Failed to parse reasoning from agent.",
            confidenceScore: agentResult.confidenceScore || 5
        });

        console.log(`Saved research report with ID: ${researchReport._id}`);
        return res.status(201).json({
            message: "Research completed successfully.",
            data: researchReport
        });
    } catch (err) {
        console.error("Error in executeResearch controller:", err);
        
        // Custom check for missing LLM API keys
        if (err.message && err.message.includes("No LLM API keys found")) {
            return res.status(500).json({
                message: "Configuration error: LLM API key is missing. Please set GEMINI_API_KEY or OPENAI_API_KEY in the backend server environment (.env file)."
            });
        }

        return res.status(500).json({
            message: "Failed to perform AI research: " + err.message
        });
    }
};

const getHistory = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                message: "Unauthorized. Please login to view history."
            });
        }

        const userObj = await User.findById(req.user.id);
        const reports = await Research.find({ userId: req.user.id }).sort({ createdAt: -1 });
        return res.status(200).json({
            message: "History retrieved successfully.",
            data: reports,
            username: userObj ? userObj.name : "Analyst"
        });
    } catch (err) {
        console.error("Error fetching research history:", err);
        return res.status(500).json({
            message: "Failed to retrieve history: " + err.message
        });
    }
};

const deleteHistoryItem = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                message: "Unauthorized. Please login to continue."
            });
        }

        const { id } = req.params;
        const deletedReport = await Research.findOneAndDelete({
            _id: id,
            userId: req.user.id
        });

        if (!deletedReport) {
            return res.status(404).json({
                message: "Research report not found or unauthorized to delete."
            });
        }

        return res.status(200).json({
            message: "Research report deleted successfully."
        });
    } catch (err) {
        console.error("Error deleting research report:", err);
        return res.status(500).json({
            message: "Failed to delete research report: " + err.message
        });
    }
};

module.exports = {
    executeResearch,
    getHistory,
    deleteHistoryItem
};
