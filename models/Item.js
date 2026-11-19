const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
    componentName: { type: String, required: true },
    description: { type: String },
    category: { type: String },
    brand: { type: String },
    specification: { type: String },
    purchasePrice: { type: Number, default: 0 },
    salePrice: { type: Number, default: 0 },
    stockQty: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Item', itemSchema);
