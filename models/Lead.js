const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
    codeNo: { type: String },
    date: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String },
    mobile: { type: String, required: true },
    company: { type: String },
    businessType: { type: String },
    location: { type: String, required: true },
    course: { type: String, required: true },
    callStatus: { type: String, default: "Set Value" },
    followUpStatus: { type: String, default: "Set Value" },
    followUpResponsibility: { type: String, default: "Set Value" },
    remainder: { type: String, default: "" },
    remainder2Task: { type: String, default: "Set Value" },
    remainder2Date: { type: String, default: "Set Value" },
    followUpAction: { type: String, default: "Pending" },
    advancePayment: { type: String, default: "Set Value" },
    dealClosed: { type: String, default: "No" },
    // 🚀 மிக முக்கியம்: இந்த வரியை கவனியுங்கள்!
    priority: { type: String, default: "Medium" } 
}, { timestamps: true });

module.exports = mongoose.model('Lead', leadSchema);