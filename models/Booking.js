const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    teacherName: {
        type: String,
        required: true
    },
    date: {
        type: String,
        required: true
    },
    startTime: {
        type: String,
        required: true
    },
    endTime: {
        type: String
    },
    subject: {
        type: String
    },
    status: {
        type: String,
        enum: ['Pending', 'Confirmed', 'Rejected', 'Completed', 'Cancelled'],
        default: 'Pending'
    },
    requestedAt: {
        type: Date,
        default: Date.now
    },
    confirmedAt: {
        type: Date
    },
    rejectedAt: {
        type: Date
    },
    completedAt: {
        type: Date
    },
    notes: {
        type: String
    }
}, {
    timestamps: true
});

module.exports = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);