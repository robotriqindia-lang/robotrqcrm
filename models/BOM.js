const mongoose = require('mongoose');

const bomSchema = new mongoose.Schema({
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'SalesLead', required: true },
    items: [{
        item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
        qty: { type: Number, default: 1 },
        purchasePrice: { type: Number, default: 0 },
        salePrice: { type: Number, default: 0 }
    }],
    totalPurchaseAmount: { type: Number, default: 0 },
    totalSaleAmount: { type: Number, default: 0 },
    netProfit: { type: Number, default: 0 },
    date: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BOM', bomSchema);
