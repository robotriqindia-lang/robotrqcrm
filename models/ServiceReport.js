const mongoose = require('mongoose');

const serviceReportSchema = new mongoose.Schema({
    reportNo: { type: String, unique: true, required: true }, // e.g. MP/TSR/2026/001
    workAuthNo: { type: String, default: '' },
    enquiryId: { type: String, default: '' }, // e.g. ENQ-030
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalesLead' },
    workType: { type: String, default: 'service' },
    projectScope: { type: String, default: '' },
    priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    targetDate: { type: String, default: '' },
    
    // Customer & Machine Info
    customer: { type: String, required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    phone: { type: String, default: '' },
    locationAddress: { type: String, default: '' },
    machineName: { type: String, default: '' },
    callByAndDate: { type: String, default: '' },
    
    // Service Type Checkboxes
    serviceTypes: {
        precommissioning: { type: Boolean, default: false },
        startUp: { type: Boolean, default: false },
        excludedByCommissioning: { type: Boolean, default: false },
        commissioning: { type: Boolean, default: false },
        training: { type: Boolean, default: false },
        extraInstallation: { type: Boolean, default: false },
        service: { type: Boolean, default: false },
        guarantee: { type: Boolean, default: false },
        other: { type: String, default: '' }
    },
    
    // Engineer & Equipment Info
    engineerName: { type: String, required: true },
    engineerNames: [{ type: String }],
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedEmployees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    assignedDate: { type: Date, default: Date.now },
    equipmentServiced: { type: String, default: '' },
    dateOfService: { type: String, default: '' }, // YYYY-MM-DD
    totalDaysOfService: { type: Number, default: 1 },
    
    // Travel Logs Table: [{ start, end, total, method }]
    travelLogs: [{
        start: { type: String, default: '' },
        end: { type: String, default: '' },
        total: { type: String, default: '' },
        method: { type: String, default: '' } // Train, Bus, Car, Bike
    }],
    travelMiles: { type: String, default: '' }, // Miles / KM
    
    // Service Time Logs Table: [{ start, end, total }]
    serviceLogs: [{
        start: { type: String, default: '' },
        end: { type: String, default: '' },
        total: { type: String, default: '' }
    }],
    totalServiceHours: { type: String, default: '0' },
    
    // Description Of Works
    plcDetails: { type: String, default: '' }, // PLC Type, Model, Serial No
    hmiDetails: { type: String, default: '' }, // HMI Type, Model, Serial No
    typeOfServicePerformed: { type: String, default: '' },
    partsRepairedOrReplaced: { type: String, default: '' },
    additionalServicePerformed: { type: String, default: '' },
    rootCauseRecommendations: { type: String, default: '' },
    
    // Customer Comments & Feedback
    customerComments: { type: String, default: '' },
    
    // Status
    status: { 
        type: String, 
        default: 'Completed' 
    },
    
    // Signatures
    minePowerRep: {
        name: { type: String, default: '' },
        title: { type: String, default: 'Service Engineer' },
        date: { type: String, default: '' },
        signature: { type: String, default: '' }
    },
    customerRep: {
        name: { type: String, default: '' },
        title: { type: String, default: 'Customer Representative' },
        date: { type: String, default: '' },
        signature: { type: String, default: '' }
    },
    
    customData: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('ServiceReport', serviceReportSchema);
