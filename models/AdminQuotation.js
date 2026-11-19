const mongoose = require('mongoose');

const adminQuotationSchema = new mongoose.Schema({
    quotationNo: { type: String, unique: true }, // e.g., RQ/2026/001
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
    robotriqLead: { type: mongoose.Schema.Types.ObjectId, ref: 'RobotriqLead' },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    date: { type: Date, default: Date.now },
    items: [{
        item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
        qty: { type: Number, default: 1 },
        salePrice: { type: Number, default: 0 },
        amount: { type: Number, default: 0 }
    }],
    totalAmount: { type: Number, default: 0 },
    transportPercent: { type: Number, default: 5 },
    transportAmount: { type: Number, default: 0 },
    gstPercent: { type: Number, default: 18 },
    gstAmount: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },
    validityDays: { type: Number, default: 15 },
    customData: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AdminQuotation', adminQuotationSchema);
