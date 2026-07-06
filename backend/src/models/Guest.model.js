const mongoose = require('mongoose');

const GuestSchema = new mongoose.Schema({
    guestId: {
        type: String,
        unique: true,
        required: true,
    },
    chatCount: {
        type: Number,
        default: 0,
    },
});

const Guest = mongoose.model('guest', GuestSchema);
module.exports = Guest;