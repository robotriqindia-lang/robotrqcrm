const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead'); // உங்க மாடல் ஃபைல் பாத் சரியா இருக்கான்னு செக் பண்ணிக்கோங்க

// ==========================================
// 1. எல்லா லீட்ஸையும் எடுக்க (GET All Leads)
// ==========================================
router.get('/', async (req, res) => {
    try {
        const leads = await Lead.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: leads });
    } catch (err) {
        console.error("Error fetching leads:", err);
        res.status(500).json({ success: false, message: "Server error while fetching leads.", error: err.message });
    }
});

// ==========================================
// 2. குறிப்பிட்ட ஒரு லீடை எடுக்க (GET Single Lead) - Optional but good practice
// ==========================================
router.get('/:id', async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id);
        if (!lead) {
            return res.status(404).json({ success: false, message: "Lead not found" });
        }
        res.status(200).json({ success: true, data: lead });
    } catch (err) {
        console.error("Error fetching single lead:", err);
        res.status(500).json({ success: false, message: "Server error while fetching the lead.", error: err.message });
    }
});

// ==========================================
// 3. புது லீட் ஆட் பண்ண (POST - Create Lead)
// ==========================================
router.post('/', async (req, res) => {
    try {
        // 🚀 Basic Validation (தேவைப்பட்டால் மாத்திக்கோங்க)
        if (!req.body.name || !req.body.mobile || !req.body.course) {
            return res.status(400).json({ success: false, message: "Name, Mobile, and Course are required fields." });
        }

        const newLead = new Lead(req.body);
        const savedLead = await newLead.save();
        res.status(201).json({ success: true, data: savedLead, message: "Lead created successfully!" });
    } catch (err) {
        console.error("Error creating lead:", err);
        // 🚀 Mongoose Validation Error-ஆ இருந்தா 400 அனுப்புவோம்
        if (err.name === 'ValidationError') {
             return res.status(400).json({ success: false, message: "Validation Error", error: err.message });
        }
        res.status(500).json({ success: false, message: "Server error while creating lead.", error: err.message });
    }
});

// ==========================================
// 4. லீடை அப்டேட் பண்ண (PUT - Update Lead)
// ==========================================
router.put('/:id', async (req, res) => {
    try {
        // req.params.id வழியா வர ID-ஐ வெச்சு டேட்டாவை அப்டேட் பண்றோம்
        const updatedLead = await Lead.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true, runValidators: true } // new: true -> அப்டேட் ஆன புது டேட்டாவை ரிட்டர்ன் பண்ணும்
        );
        
        if (!updatedLead) {
            return res.status(404).json({ success: false, message: "Lead not found to update." });
        }
        
        res.status(200).json({ success: true, data: updatedLead, message: "Lead updated successfully!" });
    } catch (err) {
        console.error("Error updating lead:", err);
        if (err.name === 'ValidationError') {
             return res.status(400).json({ success: false, message: "Validation Error during update", error: err.message });
        }
        if (err.kind === 'ObjectId') {
             return res.status(400).json({ success: false, message: "Invalid Lead ID format." });
        }
        res.status(500).json({ success: false, message: "Server error while updating lead.", error: err.message });
    }
});

// ==========================================
// 5. லீடை டெலீட் பண்ண (DELETE Lead)
// ==========================================
router.delete('/:id', async (req, res) => {
    try {
        const deletedLead = await Lead.findByIdAndDelete(req.params.id);
        
        if (!deletedLead) {
            return res.status(404).json({ success: false, message: "Lead not found to delete." });
        }

        res.status(200).json({ success: true, message: 'Lead deleted successfully' });
    } catch (err) {
        console.error("Error deleting lead:", err);
        if (err.kind === 'ObjectId') {
             return res.status(400).json({ success: false, message: "Invalid Lead ID format." });
        }
        res.status(500).json({ success: false, message: "Server error while deleting lead.", error: err.message });
    }
});

module.exports = router;