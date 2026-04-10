const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const User = require('../models/User');

// 1. Assign Task
router.post('/assign', async (req, res) => {
  try {
    const { userId, title, description, dueDate, assignedDate } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found! ❌" });

    const newTask = new Task({
      assignedTo: userId,
      userName: user.fullName,
      role: user.role,
      title,
      description,
      dueDate,
      assignedDate
    });

    await newTask.save();
    res.status(200).json({ success: true, message: "Task Assigned Successfully! 🎯" });
  } catch (error) {
    console.error("Task Assign Error:", error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// 2. Get All Tasks (Admin)
router.get('/all', async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// 3. Get User Specific Tasks
router.get('/user/:userId', async (req, res) => {
  try {
    const tasks = await Task.find({ assignedTo: req.params.userId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// 4. Update Task Status
router.put('/status/:taskId', async (req, res) => {
  try {
    const { status } = req.body;
    const task = await Task.findByIdAndUpdate(
      req.params.taskId,
      { status },
      { new: true }
    );
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.status(200).json({ success: true, message: "Task updated!", data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// 5. Get Tasks by Employee/Student ID (Admin - EmployeeDetails page)
router.get('/employee/:id', async (req, res) => {
  try {
    const tasks = await Task.find({ assignedTo: req.params.id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching tasks!' });
  }
});

module.exports = router;