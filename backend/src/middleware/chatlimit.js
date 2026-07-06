const jwt = require("jsonwebtoken");
const Guest = require("../models/Guest.model.js");

const GuestLimit = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded; // attach user info
            return next(); // authenticated users have unlimited searches
        } catch (err) {
            // token is invalid/expired; fallback to guest rate limiting
        }
    }

    const { guestId } = req.body;
    if (!guestId) {
        return res.status(400).json({
            message: "guestId is required for guest operations"
        });
    }

    try {
        const guest = await Guest.findOne({ guestId });

        if (!guest) {
            await Guest.create({
                guestId,
                chatCount: 1,
            });
            return next();
        }

        if (guest.chatCount >= 3) {
            return res.status(403).json({
                message: "Guest search limit (3) reached. Please login to perform unlimited searches.",
                limitReached: true
            });
        }

        guest.chatCount++;
        await guest.save();
        next();
    } catch (err) {
        console.error("Error in GuestLimit middleware:", err);
        return res.status(500).json({
            message: "Internal server error in rate limiting"
        });
    }
};

module.exports = GuestLimit;