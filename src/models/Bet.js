import mongoose from 'mongoose';

const betSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  matchId: String,
  market: String,
  selection: String,
  odds: Number,
  stake: Number,
  status: {
    type: String,
    enum: ['pending', 'won', 'lost', 'void', 'cashout'],
    default: 'pending',
  },
  bookmaker: String,
  settlementNotes: String,
  placedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export const Bet = mongoose.models.Bet || mongoose.model('Bet', betSchema);
export default Bet;
