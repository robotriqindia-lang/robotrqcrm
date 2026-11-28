const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  senderId: { type: String, required: true },
  senderName: { type: String, required: true },
  senderRole: { type: String, default: 'employee' },
  senderPhoto: { type: String, default: '' },
  receiverId: { type: String, default: 'all' }, // Unified team group chat
  receiverName: { type: String, default: 'Mine Power Team' },
  message: { type: String, required: true },
  messageType: { 
    type: String, 
    enum: ['message', 'event'], 
    default: 'message' 
  },
  eventType: { 
    type: String, 
    enum: [
      '', 
      'check_in', 
      'check_out', 
      'start_travel', 
      'end_travel', 
      'start_work', 
      'end_work', 
      'report_submitted', 
      'work_completed'
    ],
    default: '' 
  },
  eventData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  readBy: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
