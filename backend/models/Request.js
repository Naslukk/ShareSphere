import mongoose from 'mongoose';

const RequestSchema = new mongoose.Schema({
  requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  urgency: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }
  },
  status: { type: String, enum: ['active', 'fulfilled', 'cancelled'], default: 'active' },
  createdAt: { type: Date, default: Date.now }
});

RequestSchema.index({ location: '2dsphere' });

export default mongoose.model('Request', RequestSchema);
