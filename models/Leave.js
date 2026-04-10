const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  role: { type: String, required: true },
  fromDate: { type: String, required: true },
  toDate: { type: String, required: true },
  reason: { type: String, required: true },
  status: { type: String, default: 'Pending' } // Pending, Approved, Rejected
}, { timestamps: true });

module.exports = mongoose.model('Leave', leaveSchema);