import express from 'express';
import Request from '../models/Request.js';
import { authMiddleware } from './auth.js';

const router = express.Router();

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, urgency, location } = req.body;
    const request = new Request({
      requesterId: req.user.id,
      title, description, urgency, location
    });
    await request.save();
    res.json(request);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

router.get('/', async (req, res) => {
  try {
    const requests = await Request.find({ status: 'active' }).populate('requesterId', 'name trustScore');
    res.json(requests);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

export default router;
