const express = require('express');
const router = express.Router();
const ServiceReport = require('../models/ServiceReport');

// Helper to auto-generate next Report No: MP/TSR/YYYY/001
const generateNextReportNo = async () => {
    const year = new Date().getFullYear();
    const prefix = `MP/TSR/${year}/`;
    
    // Find highest report number for current year
    const latest = await ServiceReport.findOne({ reportNo: new RegExp(`^${prefix}`) })
        .sort({ reportNo: -1 })
        .lean();
        
    let nextNum = 1;
    if (latest && latest.reportNo) {
        const parts = latest.reportNo.split('/');
        const lastSeq = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastSeq)) {
            nextNum = lastSeq + 1;
        }
    } else {
        const totalCount = await ServiceReport.countDocuments();
        nextNum = totalCount + 1;
    }
    
    return `${prefix}${String(nextNum).padStart(3, '0')}`;
};

// GET: Summary Statistics
router.get('/stats', async (req, res) => {
    try {
        const [total, completed, inProgress, pending] = await Promise.all([
            ServiceReport.countDocuments(),
            ServiceReport.countDocuments({ status: 'Completed' }),
            ServiceReport.countDocuments({ status: 'In Progress' }),
            ServiceReport.countDocuments({ status: 'Pending' })
        ]);

        const allReports = await ServiceReport.find({}, 'serviceLogs totalServiceHours').lean();
        let totalHours = 0;
        allReports.forEach(r => {
            if (r.totalServiceHours) {
                totalHours += parseFloat(r.totalServiceHours) || 0;
            } else if (Array.isArray(r.serviceLogs)) {
                r.serviceLogs.forEach(l => {
                    totalHours += parseFloat(l.total) || 0;
                });
            }
        });

        res.json({
            success: true,
            data: {
                total,
                completed,
                inProgress,
                pending,
                totalHours: Math.round(totalHours * 10) / 10
            }
        });
    } catch (err) {
        console.error("GET Service Stats Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET: Fetch all service reports (Supports search & filters)
router.get('/', async (req, res) => {
    try {
        const { search, status, engineerId, dateFrom, dateTo } = req.query;
        let query = {};

        if (status && status !== 'all') {
            query.status = status;
        }

        if (engineerId) {
            query.$or = [
                { assignedTo: engineerId },
                { 'minePowerRep.name': new RegExp(engineerId, 'i') },
                { engineerName: new RegExp(engineerId, 'i') }
            ];
        }

        if (search) {
            const regex = new RegExp(search.trim(), 'i');
            query.$or = [
                { reportNo: regex },
                { workAuthNo: regex },
                { customer: regex },
                { machineName: regex },
                { engineerName: regex },
                { equipmentServiced: regex },
                { locationAddress: regex }
            ];
        }

        if (dateFrom || dateTo) {
            query.dateOfService = {};
            if (dateFrom) query.dateOfService.$gte = dateFrom;
            if (dateTo) query.dateOfService.$lte = dateTo;
        }

        const reports = await ServiceReport.find(query)
            .sort({ dateOfService: -1, createdAt: -1 })
            .lean();

        res.json({ success: true, count: reports.length, data: reports });
    } catch (err) {
        console.error("GET Service Reports Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET: Fetch single service report
router.get('/:id', async (req, res) => {
    try {
        const report = await ServiceReport.findById(req.params.id);
        if (!report) {
            return res.status(404).json({ success: false, message: 'Service Report not found' });
        }
        res.json({ success: true, data: report });
    } catch (err) {
        console.error("GET Single Service Report Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST: Create a new service report
router.post('/', async (req, res) => {
    try {
        let {
            reportNo,
            workAuthNo,
            customer,
            customerId,
            locationAddress,
            machineName,
            callByAndDate,
            serviceTypes,
            engineerName,
            assignedTo,
            equipmentServiced,
            dateOfService,
            totalDaysOfService,
            travelLogs,
            travelMiles,
            serviceLogs,
            totalServiceHours,
            plcDetails,
            hmiDetails,
            typeOfServicePerformed,
            partsRepairedOrReplaced,
            additionalServicePerformed,
            rootCauseRecommendations,
            customerComments,
            status,
            minePowerRep,
            customerRep,
            customData,
            createdBy
        } = req.body;

        if (!customer) {
            return res.status(400).json({ success: false, message: 'Customer name is required' });
        }

        if (!engineerName) {
            return res.status(400).json({ success: false, message: 'Service Engineer name is required' });
        }

        // Auto-generate report number if not provided or blank
        if (!reportNo || !reportNo.trim()) {
            reportNo = await generateNextReportNo();
        }

        // Check if reportNo already exists
        const existing = await ServiceReport.findOne({ reportNo: reportNo.trim() });
        if (existing) {
            reportNo = await generateNextReportNo();
        }

        // Calculate total service hours if not provided
        if (!totalServiceHours && Array.isArray(serviceLogs)) {
            let sum = 0;
            serviceLogs.forEach(l => {
                sum += parseFloat(l.total) || 0;
            });
            totalServiceHours = String(Math.round(sum * 10) / 10);
        }

        const newReport = new ServiceReport({
            reportNo: reportNo.trim(),
            workAuthNo: workAuthNo || '',
            customer: customer.trim(),
            customerId: customerId || null,
            locationAddress: locationAddress || '',
            machineName: machineName || '',
            callByAndDate: callByAndDate || '',
            serviceTypes: serviceTypes || {},
            engineerName: engineerName.trim(),
            assignedTo: assignedTo || null,
            equipmentServiced: equipmentServiced || '',
            dateOfService: dateOfService || new Date().toISOString().split('T')[0],
            totalDaysOfService: Number(totalDaysOfService) || 1,
            travelLogs: travelLogs || [],
            travelMiles: travelMiles || '',
            serviceLogs: serviceLogs || [],
            totalServiceHours: String(totalServiceHours || '0'),
            plcDetails: plcDetails || '',
            hmiDetails: hmiDetails || '',
            typeOfServicePerformed: typeOfServicePerformed || '',
            partsRepairedOrReplaced: partsRepairedOrReplaced || '',
            additionalServicePerformed: additionalServicePerformed || '',
            rootCauseRecommendations: rootCauseRecommendations || '',
            customerComments: customerComments || '',
            status: status || 'Completed',
            minePowerRep: minePowerRep || {
                name: engineerName,
                title: 'Service Engineer',
                date: dateOfService || new Date().toISOString().split('T')[0],
                signature: ''
            },
            customerRep: customerRep || {
                name: '',
                title: 'Customer Representative',
                date: dateOfService || new Date().toISOString().split('T')[0],
                signature: ''
            },
            customData: customData || {},
            createdBy: createdBy || null
        });

        const savedReport = await newReport.save();
        res.status(201).json({ success: true, data: savedReport, message: 'Technical Service Report created successfully!' });
    } catch (err) {
        console.error("POST Service Report Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT: Update an existing service report
router.put('/:id', async (req, res) => {
    try {
        const updateData = { ...req.body };
        
        // Calculate total service hours if logs provided
        if (Array.isArray(updateData.serviceLogs)) {
            let sum = 0;
            updateData.serviceLogs.forEach(l => {
                sum += parseFloat(l.total) || 0;
            });
            updateData.totalServiceHours = String(Math.round(sum * 10) / 10);
        }

        const updatedReport = await ServiceReport.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!updatedReport) {
            return res.status(404).json({ success: false, message: 'Service Report not found' });
        }

        res.json({ success: true, data: updatedReport, message: 'Technical Service Report updated successfully!' });
    } catch (err) {
        console.error("PUT Service Report Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE: Delete a service report
router.delete('/:id', async (req, res) => {
    try {
        const deletedReport = await ServiceReport.findByIdAndDelete(req.params.id);
        if (!deletedReport) {
            return res.status(404).json({ success: false, message: 'Service Report not found' });
        }
        res.json({ success: true, message: 'Technical Service Report deleted successfully!' });
    } catch (err) {
        console.error("DELETE Service Report Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
