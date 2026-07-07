const express = require("express");
const routes = express.Router();
const jwt = require("jsonwebtoken");

const { executeResearch, getHistory, deleteHistoryItem } = require("../Controller/ResearchController");
const GuestLimit = require("../middleware/chatlimit");

// Authentication middleware to protect endpoints that require login (e.g. history)
const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "Access denied. Please login to continue." });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid or expired session. Please login again." });
    }
};

// Route for executing research: applies GuestLimit middleware for guest users
routes.post("/chat", GuestLimit, executeResearch);

// Route for fetching authenticated user's research report logs
routes.get("/history", requireAuth, getHistory);

// Route for deleting a specific research log by ID
routes.delete("/history/:id", requireAuth, deleteHistoryItem);

module.exports = routes;
