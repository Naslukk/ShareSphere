import express from 'express';
import Message from '../models/Message.js';
import { authMiddleware } from './auth.js';

const router = express.Router();

router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const count = await Message.countDocuments({ receiverId: req.user.id, isRead: false });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ count: 0 });
  }
});

router.put('/mark-read/:senderId', authMiddleware, async (req, res) => {
  try {
    await Message.updateMany(
      { senderId: req.params.senderId, receiverId: req.user.id, isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

router.get('/sessions', authMiddleware, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [{ senderId: req.user.id }, { receiverId: req.user.id }]
    })
    .populate('senderId receiverId', 'name')
    .sort({ timestamp: -1 });
    
    const sessionsMap = new Map();
    messages.forEach(msg => {
      const sId = msg.senderId ? (msg.senderId._id ? msg.senderId._id.toString() : msg.senderId.toString()) : "unknown";
      const rId = msg.receiverId ? (msg.receiverId._id ? msg.receiverId._id.toString() : msg.receiverId.toString()) : "unknown";

      const isSenderMe = sId === req.user.id;
      const otherUserObj = isSenderMe ? msg.receiverId : msg.senderId;
      const otherUserId = isSenderMe ? rId : sId;
      
      const otherUserName = otherUserObj?.name || "Community Member";

      if (otherUserId !== "unknown" && !sessionsMap.has(otherUserId)) {
         sessionsMap.set(otherUserId, {
            userId: otherUserId,
            userName: otherUserName,
            lastMessage: msg.text,
            timestamp: msg.timestamp,
            unreadCount: (!isSenderMe && !msg.isRead) ? 1 : 0
         });
      } else if (otherUserId !== "unknown") {
         const s = sessionsMap.get(otherUserId);
         if (!isSenderMe && !msg.isRead) s.unreadCount += 1;
      }
    });
    res.json(Array.from(sessionsMap.values()));
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.get('/:otherUserId', authMiddleware, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { senderId: req.user.id, receiverId: req.params.otherUserId },
        { senderId: req.params.otherUserId, receiverId: req.user.id }
      ]
    }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

router.delete('/:otherUserId', authMiddleware, async (req, res) => {
  try {
    await Message.deleteMany({
      $or: [
        { senderId: req.user.id, receiverId: req.params.otherUserId },
        { senderId: req.params.otherUserId, receiverId: req.user.id }
      ]
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

export default router;
