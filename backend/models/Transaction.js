import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  consumerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  resourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resource' },
  requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Request' },
  status: { type: String, enum: ['negotiating', 'accepted', 'completed', 'cancelled'], default: 'negotiating' },
  terms: { type: String, default: '' }, // description of the barter / exchange logic
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model('Transaction', TransactionSchema);
