const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    companyName: { 
        type: String, 
        trim: true, 
        default: '' 
    },
    customerName: { 
        type: String, 
        required: true, 
        trim: true 
    },
    phone: { 
        type: String, 
        trim: true, 
        default: '' 
    },
    email: { 
        type: String, 
        trim: true, 
        default: '' 
    },
    gstNo: { 
        type: String, 
        trim: true, 
        default: '' 
    },
    address: { 
        type: String, 
        trim: true, 
        default: '' 
    },
    billNo: {
        type: String,
        trim: true,
        default: ''
    },
    lastBillNo: {
        type: String,
        trim: true,
        default: ''
    },
    lastBillAmount: {
        type: Number,
        default: 0
    },
    lastAdvancePayment: {
        type: Number,
        default: 0
    },
    lastBalancePayment: {
        type: Number,
        default: 0
    },
    totalSalesValue: {
        type: Number,
        default: 0
    },
    totalAdvance: {
        type: Number,
        default: 0
    },
    balanceDue: {
        type: Number,
        default: 0
    },
    lastSaleDate: {
        type: Date
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.model('Customer', customerSchema);
