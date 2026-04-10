const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
    day: { type: String, default: '' },
    topic: { type: String, default: '' },
    trainer: { type: String, default: '' },
    link: { type: String, default: '' }
});

const scheduleSchema = new mongoose.Schema({
    group: {
        type: String,
        required: true
        // ❌ Removed unique: true to avoid index issues
    },
    course: {
        type: String,
        default: ''
    },
    weeklySchedule: {
        type: [slotSchema],
        default: []
    }
}, {
    timestamps: true
});

// ✅ Create compound index instead
scheduleSchema.index({ group: 1 }, { unique: true });

module.exports = mongoose.models.Schedule || mongoose.model('Schedule', scheduleSchema);