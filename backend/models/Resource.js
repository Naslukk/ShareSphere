import mongoose from 'mongoose';

const ResourceSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  type: { type: String, enum: ['lend', 'donate', 'exchange', 'skill'], required: true },
  availability: { type: String, default: 'Flexible' },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }
  },
  imageUrl: { type: String, default: '' },
  status: { type: String, enum: ['available', 'reserved', 'completed'], default: 'available' },
  createdAt: { type: Date, default: Date.now }
});

ResourceSchema.index({ location: '2dsphere' });

export default mongoose.model('Resource', ResourceSchema);
