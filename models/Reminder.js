const mongoose = require('mongoose');

const ReminderSchema = new mongoose.Schema({
    leadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lead',
        required: true
    },
    leadName: { type: String, required: true },
    leadMobile: { type: String, required: true },
    course: { type: String, required: true },
    date: { type: String, required: true }, // YYYY-MM-DD format-la save aagum
    task: { type: String, required: true },
    completed: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Reminder', ReminderSchema);