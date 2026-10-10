import mongoose from 'mongoose';

const accumulatorSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  selections: [
    {
      matchId: String,
      market: String,
      selection: String,
      probability: Number,
      reason: String,
    },
  ],
  createdAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['draft', 'active', 'settled'], default: 'draft' },
}, { timestamps: true });

export const Accumulator = mongoose.models.Accumulator || mongoose.model('Accumulator', accumulatorSchema);
export default Accumulator;
