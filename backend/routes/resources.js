import express from 'express';
import Resource from '../models/Resource.js';
import Request from '../models/Request.js';
import { authMiddleware } from './auth.js';

const router = express.Router();

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, type, distance, location, imageUrl } = req.body;
    const resource = new Resource({
      ownerId: req.user.id,
      title, description, type, distance, location, imageUrl
    });
    await resource.save();

    const matches = await Request.find({
      status: 'active',
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: location.coordinates },
          $maxDistance: 5000 
        }
      }
    }).limit(5);

    res.json({ resource, matchesCount: matches.length, suggestions: matches });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.get('/', async (req, res) => {
  try {
    const resources = await Resource.find({ status: 'available' }).populate('ownerId', 'name trustScore');
    res.json(resources);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const resources = await Resource.find({ ownerId: req.user.id }).sort({ createdAt: -1 });
    res.json(resources);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    let resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ msg: 'Not found' });
    if (resource.ownerId.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });
    
    resource = await Resource.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    res.json(resource);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ msg: 'Not found' });
    if (resource.ownerId.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });

    await resource.deleteOne();
    res.json({ msg: 'Resource removed' });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

router.get('/match', authMiddleware, async (req, res) => {
  try {
    const { lng, lat, radius = 10000 } = req.query;
    if (!lng || !lat) return res.json([]);
    
    const resources = await Resource.find({
      status: 'available',
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseInt(radius)
        }
      }
    }).populate('ownerId', 'name trustScore');

    res.json(resources);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

export default router;
