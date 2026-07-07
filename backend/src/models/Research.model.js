const mongoose = require('mongoose');

const ResearchSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    guestId: {
        type: String,
        default: null
    },
    companyName: {
        type: String,
        required: true
    },
    ticker: {
        type: String,
        required: true
    },
    financials: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    news: {
        type: [mongoose.Schema.Types.Mixed],
        default: []
    },
    priceHistory: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    analysis: {
        type: String,
        required: true
    },
    decision: {
        type: String,
        enum: ['INVEST', 'PASS'],
        required: true
    },
    reasoning: {
        type: String,
        required: true
    },
    confidenceScore: {
        type: Number,
        default: 5
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Research = mongoose.model('Research', ResearchSchema);
module.exports = Research;
