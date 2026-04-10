// 📂 backend/models/Transaction.js
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    type: { 
        type: String, 
        required: true, 
        enum: ['Income', 'Expense'] 
    },
    date: { 
        type: String, 
        required: true 
    },
    desc: { 
        type: String, 
        required: true 
    },
    amount: { 
        type: Number, 
        required: true 
    }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);