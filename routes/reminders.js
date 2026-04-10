const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// ==========================================
// Reminder Schema (MongoDB)
// ==========================================
const reminderSchema = new mongoose.Schema({
    leadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lead',
        required: true
    },
    leadName: {
        type: String,
        required: true
    },
    text: {
        type: String,
        required: true
    },
    date: {
        type: String, // YYYY-MM-DD format
        required: true
    },
    type: {
        type: String,
        enum: ['note', 'task'],
        default: 'note'
    },
    completed: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Reminder = mongoose.model('Reminder', reminderSchema);

// ==========================================
// GET /api/reminders - All active reminders
// ==========================================
router.get('/', async (req, res) => {
    try {
        const reminders = await Reminder.find({ completed: false })
            .sort({ date: 1 }) // Date ascending order
            .populate('leadId', 'name mobile email'); // Lead details oda fetch

        res.json({ 
            success: true, 
            data: reminders,
            count: reminders.length 
        });
    } catch (error) {
        console.error('Fetch reminders error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch reminders' 
        });
    }
});

// ==========================================
// POST /api/reminders - Create new reminder
// ==========================================
router.post('/', async (req, res) => {
    try {
        const { leadId, leadName, text, date, type } = req.body;

        // Validation
        if (!leadId || !text || !date) {
            return res.status(400).json({
                success: false,
                error: 'leadId, text, and date are required'
            });
        }

        const reminder = new Reminder({
            leadId,
            leadName: leadName || 'Unknown Lead',
            text,
            date,
            type: type || 'note',
            completed: false
        });

        await reminder.save();

        res.status(201).json({ 
            success: true, 
            data: reminder,
            message: 'Reminder created successfully!'
        });
    } catch (error) {
        console.error('Create reminder error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to create reminder' 
        });
    }
});

// ==========================================
// PUT /api/reminders/:id - Complete/Update
// ==========================================
router.put('/:id', async (req, res) => {
    try {
        const { completed, text, date } = req.body;

        const updateData = {};
        if (completed !== undefined) updateData.completed = completed;
        if (text) updateData.text = text;
        if (date) updateData.date = date;

        const reminder = await Reminder.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        if (!reminder) {
            return res.status(404).json({
                success: false,
                error: 'Reminder not found'
            });
        }

        res.json({ 
            success: true, 
            data: reminder,
            message: completed ? 'Reminder completed! ✅' : 'Reminder updated'
        });
    } catch (error) {
        console.error('Update reminder error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to update reminder' 
        });
    }
});

// ==========================================
// DELETE /api/reminders/:id - Delete
// ==========================================
router.delete('/:id', async (req, res) => {
    try {
        const reminder = await Reminder.findByIdAndDelete(req.params.id);

        if (!reminder) {
            return res.status(404).json({
                success: false,
                error: 'Reminder not found'
            });
        }

        res.json({ 
            success: true, 
            message: 'Reminder deleted successfully'
        });
    } catch (error) {
        console.error('Delete reminder error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to delete reminder' 
        });
    }
});

// ==========================================
// GET /api/reminders/today - Today's only
// ==========================================
router.get('/today', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        const reminders = await Reminder.find({ 
            date: today,
            completed: false
        }).populate('leadId', 'name mobile');

        res.json({ 
            success: true, 
            data: reminders,
            count: reminders.length,
            date: today
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch today reminders' 
        });
    }
});

// ==========================================
// GET /api/reminders/missed - Missed only
// ==========================================
router.get('/missed', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        const reminders = await Reminder.find({ 
            date: { $lt: today },
            completed: false
        }).populate('leadId', 'name mobile');

        res.json({ 
            success: true, 
            data: reminders,
            count: reminders.length
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch missed reminders' 
        });
    }
});

module.exports = router;