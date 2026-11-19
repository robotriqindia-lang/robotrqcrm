const mongoose = require('mongoose');

const salesLeadSchema = new mongoose.Schema({
    enquiryId: { type: String, unique: true }, // e.g., ENQ-001
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    customerName: { type: String, required: true, trim: true },
    companyName: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, default: '' },
    application: { type: String, trim: true, default: '' },
    reference: { type: String, trim: true, default: '' },
    enquiryDetails: { type: String, default: '' }, // Multiline details typed by user
    status: { 
        type: String, 
        default: 'New'
    },
    enquiryDate: { type: Date, default: Date.now },
    type: { type: String, enum: ['service', 'material', 'project', 'panel'] },
    assignedEmployee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    billNo: { type: String, trim: true, default: '' },
    billAmount: { type: Number, default: 0 },
    advancePayment: { type: Number, default: 0 },
    fullPayment: { type: Number, default: 0 },
    balancePayment: { type: Number, default: 0 },
    commitmentDate: { type: Date },
    saleCreatedDate: { type: Date },
    accountCompleted: { type: Boolean, default: false },
    accountCompletedDate: { type: Date },
    priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    lostReason: { type: String, trim: true, default: '' },
    lostDate: { type: Date },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SalesLead', salesLeadSchema);
