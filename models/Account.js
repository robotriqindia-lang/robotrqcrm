const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
    type: { 
        type: String, 
        enum: ['Income', 'Expense'], 
        required: true 
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
    },
    status: {
        type: String,
        default: 'Pending',
        enum: ['Pending', 'Paid']
    }
}, { timestamps: true });

// 'Account' ngra perula intha schema-va export pandrom
module.exports = mongoose.model('Account', accountSchema);