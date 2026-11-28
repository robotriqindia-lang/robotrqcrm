const express = require('express');
const router = express.Router();
const ChatMessage = require('../models/ChatMessage');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/authMiddleware');

// 1. Get all messages & events for the Unified Team Group Chat
router.get('/messages', protect, async (req, res) => {
  try {
    // Return all group chat messages and event logs in chronological order
    const messages = await ChatMessage.find({})
      .sort({ createdAt: 1 })
      .limit(300);

    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).json({ success: false, message: 'Failed to load messages' });
  }
});

// 2. Send a new group chat message
router.post('/send', protect, async (req, res) => {
  try {
    const { 
      message, 
      messageType = 'message', 
      eventType = '', 
      eventData = {},
      receiverId = 'all', 
      receiverName = 'Mine Power Team' 
    } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message content is required' });
    }

    const senderIdStr = String(req.user._id || req.user.id || 'system');
    const senderName = req.user.fullName || req.user.name || 'Employee';
    const senderRole = req.user.role || 'employee';
    const senderPhoto = req.user.photo || req.user.profileImage || '';

    const newMsg = await ChatMessage.create({
      senderId: senderIdStr,
      senderName,
      senderRole,
      senderPhoto,
      receiverId,
      receiverName,
      message: message.trim(),
      messageType,
      eventType,
      eventData,
      readBy: [senderIdStr]
    });

    res.status(201).json({ success: true, data: newMsg });
  } catch (error) {
    console.error('Error sending chat message:', error);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
});

// 3. Log an employee activity event into the team feed
router.post('/event', protect, async (req, res) => {
  try {
    const { 
      eventType, 
      message, 
      eventData = {} 
    } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Event message is required' });
    }

    const senderIdStr = String(req.user._id || req.user.id || 'system');
    const senderName = req.user.fullName || req.user.name || 'Employee';
    const senderRole = req.user.role || 'employee';
    const senderPhoto = req.user.photo || req.user.profileImage || '';

    const newEvent = await ChatMessage.create({
      senderId: senderIdStr,
      senderName,
      senderRole,
      senderPhoto,
      receiverId: 'all',
      receiverName: 'Mine Power Team',
      message: message.trim(),
      messageType: 'event',
      eventType: eventType || 'general_event',
      eventData,
      readBy: [senderIdStr]
    });

    res.status(201).json({ success: true, data: newEvent });
  } catch (error) {
    console.error('Error logging team event:', error);
    res.status(500).json({ success: false, message: 'Failed to log event' });
  }
});

// 4. Mark messages as read for current user
router.put('/mark-read', protect, async (req, res) => {
  try {
    const userIdStr = String(req.user._id || req.user.id);
    await ChatMessage.updateMany(
      {
        readBy: { $ne: userIdStr }
      },
      {
        $addToSet: { readBy: userIdStr }
      }
    );
    res.status(200).json({ success: true, message: 'Messages marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error marking messages as read' });
  }
});

// 5. Get unread messages count and latest message for current user
router.get('/unread', protect, async (req, res) => {
  try {
    const userIdStr = String(req.user._id || req.user.id);
    const unreadMessages = await ChatMessage.find({
      senderId: { $ne: userIdStr },
      readBy: { $ne: userIdStr }
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: unreadMessages.length,
      latestMessage: unreadMessages[0] || null
    });
  } catch (error) {
    res.status(500).json({ success: false, count: 0 });
  }
});

module.exports = router;
