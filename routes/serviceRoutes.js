const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const ServiceReport = require('../models/ServiceReport');
const SalesLead = require('../models/SalesLead');
const Customer = require('../models/Customer');

// Helper to auto-generate next Report No: MP/TSR/YYYY/001
const generateNextReportNo = async () => {
    const year = new Date().getFullYear();
    const prefix = `MP/TSR/${year}/`;
    
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

// Helper to auto-generate next Enquiry ID: ENQ-XXX
const generateNextEnquiryId = async () => {
    const lastLead = await SalesLead.findOne({}, { enquiryId: 1 }).sort({ enquiryId: -1 });
    let nextIdNumber = 1;
    if (lastLead && lastLead.enquiryId && lastLead.enquiryId.startsWith('ENQ-')) {
        const lastIdNum = parseInt(lastLead.enquiryId.split('-')[1]);
        if (!isNaN(lastIdNum)) {
            nextIdNumber = lastIdNum + 1;
        }
    } else {
        const count = await SalesLead.countDocuments();
        nextIdNumber = count + 1;
    }
    return `ENQ-${nextIdNumber.toString().padStart(3, '0')}`;
};

// Helper to evaluate if status represents a completed state
const isCompletedStatus = (statusStr) => {
    if (!statusStr) return false;
    const s = statusStr.toLowerCase().trim().replace(/[-_]/g, ' ');
    return s === 'completed' || s === 'work completed' || s === 'sale created' || s === 'full payment received' || s === 'delivered' || s === 'closed' || s.includes('complet');
};

// Helper to evaluate if status represents Work in Progress / In Progress
const isInProgressStatus = (statusStr) => {
    if (!statusStr) return false;
    const s = statusStr.toLowerCase().trim().replace(/[-_]/g, ' ');
    return s === 'in progress' || s === 'work in progress' || s === 'work in process' || s === 'in process' || s === 'wip' || s.includes('progress') || s.includes('process');
};

// Core Helper: Aggregate & unify Service & Project Enquiries with ServiceReports
const getUnifiedServices = async () => {
    // 1. Fetch all SalesLeads of type 'service' or 'project' (or assigned to employees)
    const leads = await SalesLead.find({ 
        $or: [
            { type: { $in: ['service', 'project', 'Service', 'Project'] } },
            { assignedEmployee: { $exists: true, $ne: null } },
            { 'assignedEmployees.0': { $exists: true } }
        ]
    }).populate('assignedEmployee customer assignedEmployees').lean();

    // 2. Fetch all ServiceReports
    const reports = await ServiceReport.find()
        .populate('assignedTo customerId assignedEmployees')
        .lean();

    // Index reports by leadId, enquiryId, and customer+machine
    const reportByLeadId = {};
    const reportByEnquiryId = {};
    const matchedReportIds = new Set();

    reports.forEach(r => {
        if (r.leadId) reportByLeadId[r.leadId.toString()] = r;
        if (r.enquiryId) reportByEnquiryId[r.enquiryId.trim().toUpperCase()] = r;
    });

    const unified = [];

    // Merge Leads into Unified items
    leads.forEach(lead => {
        const leadIdStr = lead._id.toString();
        const enqIdUpper = (lead.enquiryId || '').trim().toUpperCase();

        const report = reportByLeadId[leadIdStr] || reportByEnquiryId[enqIdUpper] || null;
        if (report) {
            matchedReportIds.add(report._id.toString());
        }

        const rawStatus = report?.status || lead.status || 'New';
        const isCompleted = isCompletedStatus(rawStatus);
        const isInProgress = isInProgressStatus(rawStatus);
        // All service/project enquiries that are not yet marked completed are considered active works
        const resolvedCategory = isCompleted ? 'completed' : 'active';
        const displayStatus = rawStatus;

        unified.push({
            _id: report?._id || lead._id,
            leadId: lead._id,
            reportId: report?._id || null,
            enquiryId: lead.enquiryId || '',
            workType: lead.type || (report?.workType || 'service'),
            customer: lead.companyName || lead.customerName || (typeof lead.customer === 'object' ? lead.customer?.companyName || lead.customer?.customerName : '') || report?.customer || 'Customer',
            customerName: lead.customerName || (typeof lead.customer === 'object' ? lead.customer?.customerName : '') || '',
            companyName: lead.companyName || (typeof lead.customer === 'object' ? lead.customer?.companyName : '') || '',
            customerId: (typeof lead.customer === 'object' ? lead.customer?._id : lead.customer) || report?.customerId?._id || report?.customerId || null,
            phone: lead.phone || (typeof lead.customer === 'object' ? lead.customer?.phone : '') || '',
            email: lead.email || (typeof lead.customer === 'object' ? lead.customer?.email : '') || '',
            machineName: report?.machineName || lead.application || '',
            equipmentServiced: report?.equipmentServiced || lead.application || '',
            projectScope: report?.projectScope || lead.application || '',
            locationAddress: report?.locationAddress || (typeof lead.customer === 'object' ? lead.customer?.address : '') || '',
            enquiryDetails: lead.enquiryDetails || '',
            engineerName: report?.engineerName || (Array.isArray(lead.assignedEmployees) && lead.assignedEmployees.length > 0 ? lead.assignedEmployees.map(e => e?.fullName || e?.userName).filter(Boolean).join(', ') : lead.assignedEmployee?.fullName || ''),
            engineerNames: report?.engineerNames || (Array.isArray(lead.assignedEmployees) ? lead.assignedEmployees.map(e => e?.fullName || e?.userName).filter(Boolean) : (lead.assignedEmployee?.fullName ? [lead.assignedEmployee.fullName] : [])),
            assignedTo: report?.assignedTo?._id || report?.assignedTo || lead.assignedEmployee?._id || lead.assignedEmployee || (Array.isArray(lead.assignedEmployees) && lead.assignedEmployees[0]?._id ? lead.assignedEmployees[0]._id : null),
            assignedEmployees: report?.assignedEmployees || lead.assignedEmployees || (lead.assignedEmployee ? [lead.assignedEmployee] : []),
            assignedDate: report?.assignedDate || lead.assignedDate || lead.enquiryDate || null,
            priority: lead.priority || report?.priority || 'Medium',
            dateOfService: report?.dateOfService || (lead.enquiryDate ? new Date(lead.enquiryDate).toISOString().split('T')[0] : ''),
            status: displayStatus,
            category: resolvedCategory,
            hasReport: Boolean(report),
            reportNo: report?.reportNo || '',
            workAuthNo: report?.workAuthNo || '',
            totalServiceHours: report?.totalServiceHours || '0',
            travelLogs: report?.travelLogs || [],
            serviceLogs: report?.serviceLogs || [],
            serviceTypes: report?.serviceTypes || {},
            plcDetails: report?.plcDetails || '',
            hmiDetails: report?.hmiDetails || '',
            typeOfServicePerformed: report?.typeOfServicePerformed || '',
            partsRepairedOrReplaced: report?.partsRepairedOrReplaced || '',
            additionalServicePerformed: report?.additionalServicePerformed || '',
            rootCauseRecommendations: report?.rootCauseRecommendations || '',
            customerComments: report?.customerComments || '',
            minePowerRep: report?.minePowerRep || null,
            customerRep: report?.customerRep || null,
            reportData: report || null,
            createdAt: lead.createdAt || report?.createdAt || new Date()
        });
    });

    // Also include any standalone ServiceReports that weren't linked to a SalesLead
    reports.forEach(report => {
        if (!matchedReportIds.has(report._id.toString())) {
            const rawStatus = report.status || 'Work in Progress';
            const isCompleted = isCompletedStatus(rawStatus);
            const isInProgress = isInProgressStatus(rawStatus);
            const resolvedCategory = isCompleted ? 'completed' : 'active';
            const fallbackEnquiryId = report.enquiryId || `ENQ-SRV-${report.reportNo.split('/').pop() || '001'}`;

            unified.push({
                _id: report._id,
                leadId: null,
                reportId: report._id,
                enquiryId: fallbackEnquiryId,
                workType: report.workType || 'service',
                customer: report.customer || 'Customer',
                customerName: report.customer || '',
                companyName: (typeof report.customerId === 'object' ? report.customerId?.companyName : '') || report.customer || '',
                customerId: report.customerId?._id || report.customerId || null,
                phone: (typeof report.customerId === 'object' ? report.customerId?.phone : '') || '',
                email: (typeof report.customerId === 'object' ? report.customerId?.email : '') || '',
                machineName: report.machineName || report.equipmentServiced || '',
                equipmentServiced: report.equipmentServiced || report.machineName || '',
                projectScope: report.projectScope || '',
                locationAddress: report.locationAddress || '',
                enquiryDetails: report.typeOfServicePerformed || '',
                engineerName: report.engineerName || (typeof report.assignedTo === 'object' ? report.assignedTo?.fullName : '') || '',
                assignedTo: report.assignedTo?._id || report.assignedTo || null,
                priority: report.priority || 'Medium',
                dateOfService: report.dateOfService || '',
                status: rawStatus,
                category: resolvedCategory,
                hasReport: true,
                reportNo: report.reportNo,
                workAuthNo: report.workAuthNo || '',
                totalServiceHours: report.totalServiceHours || '0',
                travelLogs: report.travelLogs || [],
                serviceLogs: report.serviceLogs || [],
                serviceTypes: report.serviceTypes || {},
                plcDetails: report.plcDetails || '',
                hmiDetails: report.hmiDetails || '',
                typeOfServicePerformed: report.typeOfServicePerformed || '',
                partsRepairedOrReplaced: report.partsRepairedOrReplaced || '',
                additionalServicePerformed: report.additionalServicePerformed || '',
                rootCauseRecommendations: report.rootCauseRecommendations || '',
                customerComments: report.customerComments || '',
                minePowerRep: report.minePowerRep || null,
                customerRep: report.customerRep || null,
                reportData: report,
                createdAt: report.createdAt || new Date()
            });
        }
    });

    // Sort by createdAt / date descending
    unified.sort((a, b) => new Date(b.createdAt || b.dateOfService || 0) - new Date(a.createdAt || a.dateOfService || 0));

    return unified;
};

// GET: Summary Statistics (Active, Completed, Services, Projects, Hours)
router.get('/stats', async (req, res) => {
    try {
        const unified = await getUnifiedServices();
        
        let totalHours = 0;
        unified.forEach(item => {
            totalHours += parseFloat(item.totalServiceHours) || 0;
        });

        const activeCount = unified.filter(i => isInProgressStatus(i.status)).length;
        const completedCount = unified.filter(i => isCompletedStatus(i.status)).length;
        const servicesCount = unified.filter(i => i.workType === 'service').length;
        const projectsCount = unified.filter(i => i.workType === 'project').length;

        res.json({
            success: true,
            data: {
                total: unified.length,
                active: activeCount,
                inProgress: activeCount,
                completed: completedCount,
                services: servicesCount,
                projects: projectsCount,
                totalHours: Math.round(totalHours * 10) / 10
            }
        });
    } catch (err) {
        console.error("GET Service Stats Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET: Fetch all services and projects (supports category=active|completed|all, workType=service|project, search, engineerId)
router.get('/', async (req, res) => {
    try {
        const { search, status, category, workType, engineerId, dateFrom, dateTo } = req.query;
        let list = await getUnifiedServices();

        // 1. Filter by Category (active vs completed)
        if (category && category !== 'all') {
            if (category === 'active') {
                list = list.filter(i => isInProgressStatus(i.status));
            } else if (category === 'completed') {
                list = list.filter(i => isCompletedStatus(i.status));
            } else {
                list = list.filter(i => i.category === category);
            }
        }

        // 2. Filter by Work Type (service vs project)
        if (workType && workType !== 'all') {
            list = list.filter(i => (i.workType || '').toLowerCase() === workType.toLowerCase());
        }

        // 3. Filter by Specific Status
        if (status && status !== 'all') {
            list = list.filter(i => (i.status || '').toLowerCase() === status.toLowerCase());
        }

        // 4. Filter by Engineer
        if (engineerId && engineerId !== 'all') {
            list = list.filter(i => {
                const assignedMatch = i.assignedTo && String(i.assignedTo) === String(engineerId);
                const nameMatch = i.engineerName && i.engineerName.toLowerCase().includes(engineerId.toLowerCase());
                return assignedMatch || nameMatch;
            });
        }

        // 5. Search Filter
        if (search && search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter(i => 
                (i.enquiryId || '').toLowerCase().includes(q) ||
                (i.reportNo || '').toLowerCase().includes(q) ||
                (i.workAuthNo || '').toLowerCase().includes(q) ||
                (i.customer || '').toLowerCase().includes(q) ||
                (i.companyName || '').toLowerCase().includes(q) ||
                (i.customerName || '').toLowerCase().includes(q) ||
                (i.machineName || '').toLowerCase().includes(q) ||
                (i.equipmentServiced || '').toLowerCase().includes(q) ||
                (i.projectScope || '').toLowerCase().includes(q) ||
                (i.engineerName || '').toLowerCase().includes(q) ||
                (i.locationAddress || '').toLowerCase().includes(q)
            );
        }

        // 6. Date Range Filter
        if (dateFrom || dateTo) {
            list = list.filter(i => {
                const d = i.dateOfService;
                if (!d) return true;
                if (dateFrom && d < dateFrom) return false;
                if (dateTo && d > dateTo) return false;
                return true;
            });
        }

        res.json({ success: true, count: list.length, data: list });
    } catch (err) {
        console.error("GET Service Reports Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET: Customer's complete Service & Project History
router.get('/customer/:customerId', async (req, res) => {
    try {
        const { customerId } = req.params;
        const allServices = await getUnifiedServices();
        
        let customerObj = null;
        if (mongoose.Types.ObjectId.isValid(customerId)) {
            customerObj = await Customer.findById(customerId).lean();
        }

        const filtered = allServices.filter(item => {
            if (item.customerId && String(item.customerId) === String(customerId)) return true;
            if (customerObj) {
                const companyMatch = customerObj.companyName && item.customer && item.customer.toLowerCase().includes(customerObj.companyName.toLowerCase());
                const nameMatch = customerObj.customerName && item.customerName && item.customerName.toLowerCase().includes(customerObj.customerName.toLowerCase());
                if (companyMatch || nameMatch) return true;
            }
            return false;
        });

        res.json({ success: true, count: filtered.length, data: filtered });
    } catch (err) {
        console.error("GET Customer Service History Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST: Create New Service or Project (Anchor by Enquiry ID)
router.post('/create-work', async (req, res) => {
    try {
        const {
            workType = 'service', // 'service' or 'project'
            customerName,
            companyName,
            customerId,
            phone,
            email,
            machineName,
            projectScope,
            locationAddress,
            enquiryDetails,
            assignedEmployee,
            assignedEmployees,
            engineerName,
            engineerNames,
            priority = 'Medium',
            targetDate,
            assignedDate,
            status = 'Work in Progress'
        } = req.body;

        if (!customerName && !companyName) {
            return res.status(400).json({ success: false, message: 'Customer or Company name is required' });
        }

        const nextEnqId = await generateNextEnquiryId();

        const resolvedAssignedEmployees = Array.isArray(assignedEmployees) && assignedEmployees.length > 0
            ? assignedEmployees
            : (assignedEmployee ? [assignedEmployee] : []);
        const primaryAssigned = assignedEmployee || (resolvedAssignedEmployees[0] || null);

        // 1. Create SalesLead record as the master enquiry
        const leadPayload = {
            enquiryId: nextEnqId,
            customer: customerId || null,
            customerName: customerName || companyName || 'Customer',
            companyName: companyName || customerName || '',
            phone: phone || '',
            email: email || '',
            application: machineName || projectScope || (workType === 'project' ? 'Automation Project' : 'Technical Service'),
            enquiryDetails: enquiryDetails || '',
            type: workType,
            assignedEmployee: primaryAssigned,
            assignedEmployees: resolvedAssignedEmployees,
            priority: priority,
            status: status,
            assignedDate: assignedDate ? new Date(assignedDate) : new Date(),
            enquiryDate: new Date()
        };

        const newLead = await SalesLead.create(leadPayload);

        res.status(201).json({
            success: true,
            message: `${workType === 'project' ? 'Project' : 'Service'} created successfully with ID ${nextEnqId}!`,
            data: {
                _id: newLead._id,
                leadId: newLead._id,
                enquiryId: nextEnqId,
                workType,
                customer: companyName || customerName,
                customerName: customerName || companyName,
                companyName: companyName || customerName,
                customerId,
                machineName: machineName || projectScope || '',
                status,
                hasReport: false
            }
        });
    } catch (err) {
        console.error("POST create-work Error:", err);
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

// POST: Create / Submit a new Technical Service Report (links to enquiryId & leadId)
router.post('/', async (req, res) => {
    try {
        let {
            reportNo,
            workAuthNo,
            enquiryId,
            leadId,
            workType,
            projectScope,
            customer,
            customerId,
            phone,
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

        // Sanitize ObjectId fields to prevent CastError
        const toObjectIdOrNull = (val) => {
            if (!val) return null;
            if (typeof val === 'object' && val._id) val = val._id;
            const str = String(val).trim();
            if (mongoose.Types.ObjectId.isValid(str) && String(new mongoose.Types.ObjectId(str)) === str) {
                return new mongoose.Types.ObjectId(str);
            }
            return null;
        };

        const newReport = new ServiceReport({
            reportNo: reportNo.trim(),
            workAuthNo: workAuthNo || '',
            enquiryId: enquiryId || '',
            leadId: toObjectIdOrNull(leadId),
            workType: workType || 'service',
            projectScope: projectScope || '',
            customer: customer.trim(),
            customerId: toObjectIdOrNull(customerId),
            phone: phone || '',
            locationAddress: locationAddress || '',
            machineName: machineName || '',
            callByAndDate: callByAndDate || '',
            serviceTypes: serviceTypes || {},
            engineerName: engineerName.trim(),
            assignedTo: toObjectIdOrNull(assignedTo),
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
            createdBy: toObjectIdOrNull(createdBy)
        });

        const savedReport = await newReport.save();

        // If linked to a lead, update the lead status to 'Work Completed'
        if (leadId) {
            await SalesLead.findByIdAndUpdate(leadId, { status: 'Work Completed' }).catch(() => {});
        } else if (enquiryId) {
            await SalesLead.findOneAndUpdate({ enquiryId }, { status: 'Work Completed' }).catch(() => {});
        }

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

        const toObjectIdOrNull = (val) => {
            if (!val) return null;
            if (typeof val === 'object' && val._id) val = val._id;
            const str = String(val).trim();
            if (mongoose.Types.ObjectId.isValid(str) && String(new mongoose.Types.ObjectId(str)) === str) {
                return new mongoose.Types.ObjectId(str);
            }
            return null;
        };

        if ('customerId' in updateData) updateData.customerId = toObjectIdOrNull(updateData.customerId);
        if ('leadId' in updateData) updateData.leadId = toObjectIdOrNull(updateData.leadId);
        if ('assignedTo' in updateData) updateData.assignedTo = toObjectIdOrNull(updateData.assignedTo);
        if ('createdBy' in updateData) updateData.createdBy = toObjectIdOrNull(updateData.createdBy);
        
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
            { new: true, runValidators: false }
        );

        if (!updatedReport) {
            return res.status(404).json({ success: false, message: 'Service Report not found' });
        }

        // If status completed, update lead too
        if (updatedReport.status === 'Completed' && (updatedReport.leadId || updatedReport.enquiryId)) {
            if (updatedReport.leadId) {
                await SalesLead.findByIdAndUpdate(updatedReport.leadId, { status: 'Work Completed' }).catch(() => {});
            } else if (updatedReport.enquiryId) {
                await SalesLead.findOneAndUpdate({ enquiryId: updatedReport.enquiryId }, { status: 'Work Completed' }).catch(() => {});
            }
        }

        res.json({ success: true, data: updatedReport, message: 'Technical Service Report updated successfully!' });
    } catch (err) {
        console.error("PUT Service Report Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// PATCH & POST: Mark a service report as completed by employee
const completeServiceHandler = async (req, res) => {
    try {
        const { 
            typeOfServicePerformed, 
            partsRepairedOrReplaced, 
            additionalServicePerformed, 
            rootCauseRecommendations, 
            customerComments,
            totalServiceHours,
            completedBy
        } = req.body;

        const updateFields = {
            status: 'Completed',
            dateOfService: req.body.dateOfService || new Date().toISOString().split('T')[0]
        };

        if (typeOfServicePerformed) updateFields.typeOfServicePerformed = typeOfServicePerformed;
        if (partsRepairedOrReplaced) updateFields.partsRepairedOrReplaced = partsRepairedOrReplaced;
        if (additionalServicePerformed) updateFields.additionalServicePerformed = additionalServicePerformed;
        if (rootCauseRecommendations) updateFields.rootCauseRecommendations = rootCauseRecommendations;
        if (customerComments) updateFields.customerComments = customerComments;
        if (totalServiceHours) updateFields.totalServiceHours = String(totalServiceHours);
        if (completedBy) {
            updateFields['minePowerRep.name'] = completedBy;
            updateFields['minePowerRep.signedAt'] = new Date().toISOString();
        }

        let updated = null;
        if (mongoose.Types.ObjectId.isValid(req.params.id)) {
            updated = await ServiceReport.findByIdAndUpdate(
                req.params.id,
                { $set: updateFields },
                { new: true }
            );
        }

        if (!updated) {
            updated = await ServiceReport.findOneAndUpdate(
                { $or: [{ enquiryId: req.params.id }, { reportNo: req.params.id }, { leadId: req.params.id }] },
                { $set: updateFields },
                { new: true }
            );
        }

        if (!updated) {
            // Check if id is a SalesLead id or enquiryId
            let lead = null;
            if (mongoose.Types.ObjectId.isValid(req.params.id)) {
                lead = await SalesLead.findById(req.params.id);
            }
            if (!lead) {
                lead = await SalesLead.findOne({ enquiryId: req.params.id });
            }
            if (lead) {
                await SalesLead.findByIdAndUpdate(lead._id, { status: 'Work Completed' });
                // Create a completed ServiceReport so history and TSR exist
                const nextReportNo = await generateNextReportNo();
                updated = await ServiceReport.create({
                    reportNo: nextReportNo,
                    enquiryId: lead.enquiryId || '',
                    leadId: lead._id,
                    workType: lead.type || 'service',
                    customer: lead.companyName || lead.customerName || 'Customer',
                    customerId: lead.customer,
                    machineName: lead.application || '',
                    equipmentServiced: lead.application || '',
                    projectScope: lead.application || '',
                    engineerName: completedBy || 'Service Engineer',
                    assignedTo: lead.assignedEmployee,
                    assignedEmployees: lead.assignedEmployees,
                    status: 'Completed',
                    dateOfService: updateFields.dateOfService,
                    typeOfServicePerformed: updateFields.typeOfServicePerformed || '',
                    partsRepairedOrReplaced: updateFields.partsRepairedOrReplaced || '',
                    additionalServicePerformed: updateFields.additionalServicePerformed || '',
                    rootCauseRecommendations: updateFields.rootCauseRecommendations || '',
                    customerComments: updateFields.customerComments || '',
                    totalServiceHours: updateFields.totalServiceHours || '1',
                    minePowerRep: { name: completedBy || '', date: updateFields.dateOfService }
                });
                return res.json({ success: true, data: updated, message: `Report ${nextReportNo} generated and work ${lead.enquiryId || req.params.id} marked as Completed!` });
            }
            return res.status(404).json({ success: false, message: 'Service Report or Enquiry not found' });
        }

        if (updated.leadId) {
            await SalesLead.findByIdAndUpdate(updated.leadId, { status: 'Work Completed' }).catch(() => {});
        } else if (updated.enquiryId) {
            await SalesLead.findOneAndUpdate({ enquiryId: updated.enquiryId }, { status: 'Work Completed' }).catch(() => {});
        }

        res.json({ success: true, data: updated, message: `Service Report ${updated.reportNo} marked as Completed!` });
    } catch (err) {
        console.error("Complete Service Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

router.patch('/:id/complete', completeServiceHandler);
router.post('/:id/complete', completeServiceHandler);

// PATCH: Update status of a work item / service / lead
router.patch('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ success: false, message: 'Status is required' });
        }

        const id = req.params.id;
        let updated = null;

        if (mongoose.Types.ObjectId.isValid(id)) {
            updated = await ServiceReport.findByIdAndUpdate(id, { status }, { new: true });
            if (!updated) {
                await SalesLead.findByIdAndUpdate(id, { status }).catch(() => {});
            }
        } else {
            // Check if id is an enquiryId (e.g. ENQ-115) or reportNo
            updated = await ServiceReport.findOneAndUpdate(
                { $or: [{ enquiryId: id }, { reportNo: id }] },
                { status },
                { new: true }
            );
            await SalesLead.findOneAndUpdate({ enquiryId: id }, { status }).catch(() => {});
        }

        if (updated && updated.leadId) {
            await SalesLead.findByIdAndUpdate(updated.leadId, { status }).catch(() => {});
        } else if (updated && updated.enquiryId) {
            await SalesLead.findOneAndUpdate({ enquiryId: updated.enquiryId }, { status }).catch(() => {});
        }

        res.json({ success: true, message: `Status updated to ${status} successfully!` });
    } catch (err) {
        console.error("PATCH service status error:", err);
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
