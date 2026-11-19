const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    employeeName: {
        type: String,
        required: true
    },
    date: {
        type: String,
        required: true
    },
    description: {
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
    },
    type: {
        type: String,
        enum: ['Expense', 'Allocation'],
        default: 'Expense'
    }
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);
