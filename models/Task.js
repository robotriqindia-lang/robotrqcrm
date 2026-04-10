const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  role: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String },
  dueDate: { type: String },
  status: { type: String, default: 'Pending' } // Pending, Completed
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);