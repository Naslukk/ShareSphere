import express from 'express';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import Resource from '../models/Resource.js';
import { authMiddleware } from './auth.js';

const router = express.Router();

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { providerId, resourceId, requestId, terms } = req.body;
    const transaction = new Transaction({
      providerId,
      consumerId: req.user.id,
      resourceId,
      requestId,
      terms
    });
    await transaction.save();

    res.json(transaction);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

router.put('/:id/complete', authMiddleware, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) return res.status(404).json({ msg: 'Transaction not found' });

    transaction.status = 'completed';
    await transaction.save();

    // Unique Community Economic Score calculation logic
    // Give 10 CIS points to the person who shared or helped
    const provider = await User.findById(transaction.providerId);
    provider.communityImpactScore += 10;
    
    // Also increase Trust Score slightly upon successful transaction MVP
    provider.trustScore += 2;
    await provider.save();

    if (transaction.resourceId) {
      await Resource.findByIdAndUpdate(transaction.resourceId, { status: 'completed' });
    }

    res.json(transaction);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const transactions = await Transaction.find({
      $or: [{ providerId: req.user.id }, { consumerId: req.user.id }]
    }).populate('providerId consumerId resourceId');
    res.json(transactions);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});
router.post('/quick-complete', authMiddleware, async (req, res) => {
  try {
    const { consumerId, resourceId } = req.body;
    const providerId = req.user.id;
    
    const transaction = new Transaction({ providerId, consumerId, resourceId, status: 'completed' });
    
    if (resourceId) {
      await Resource.findByIdAndUpdate(resourceId, { status: 'completed' });
    }

    const provider = await User.findById(providerId);
    if (provider) {
      provider.communityImpactScore = (provider.communityImpactScore || 0) + 10;
      provider.trustScore = (provider.trustScore || 100) + 2;
      provider.exchangesCompleted = (provider.exchangesCompleted || 0) + 1;
      provider.co2Saved = (provider.co2Saved || 0) + 12.5;
      await provider.save();
    }

    const consumer = await User.findById(consumerId);
    if (consumer) {
      consumer.exchangesCompleted = (consumer.exchangesCompleted || 0) + 1;
      consumer.co2Saved = (consumer.co2Saved || 0) + 12.5;
      await consumer.save();
    }

    await transaction.save();
    res.json(transaction);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

export default router;
