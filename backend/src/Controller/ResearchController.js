const { runResearchAgent } = require('../services/researchAgent');
const Research = require('../models/Research.model');

const executeResearch = async (req, res) => {
    const { message, guestId } = req.body;
    if (!message || message.trim() === "") {
        return res.status(400).json({
            message: "Company name (message) is required."
        });
    }

    try {
        console.log(`Starting AI Research for company: "${message}"`);
        const agentResult = await runResearchAgent(message);

        // Save report to database
        const researchReport = await Research.create({
            userId: req.user ? req.user.id : null,
            guestId: req.user ? null : (guestId || null),
            companyName: agentResult.companyName || message,
            ticker: agentResult.ticker || "UNKNOWN",
            financials: agentResult.financials || {},
            news: agentResult.news || [],
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

        const reports = await Research.find({ userId: req.user.id }).sort({ createdAt: -1 });
        return res.status(200).json({
            message: "History retrieved successfully.",
            data: reports
        });
    } catch (err) {
        console.error("Error fetching research history:", err);
        return res.status(500).json({
            message: "Failed to retrieve history: " + err.message
        });
    }
};

module.exports = {
    executeResearch,
    getHistory
};
