const express = require('express');
const router = express.Router();
const Item = require('../models/Item');

// 1. Get all items
router.get('/', async (req, res) => {
    try {
        const items = await Item.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: items });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching items" });
    }
});

// 2. Add new item
router.post('/', async (req, res) => {
    try {
        const newItem = await Item.create(req.body);
        res.status(201).json({ success: true, data: newItem });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error creating item" });
    }
});

// 3. Update item
router.put('/:id', async (req, res) => {
    try {
        const updatedItem = await Item.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json({ success: true, data: updatedItem });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error updating item" });
    }
});

// 4. Delete item
router.delete('/:id', async (req, res) => {
    try {
        await Item.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: "Item deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error deleting item" });
    }
});

module.exports = router;
