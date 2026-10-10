import mongoose from 'mongoose';

const matchSchema = new mongoose.Schema({
  fixtureId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  provider: { type: String, required: true, default: 'api-football' },
  providerUpdatedAt: { type: Date, required: true },
  league: {
    id: { type: String, required: true, index: true },
    name: { type: String, required: true },
    country: String,
    season: Number,
  },
  kickoffAt: { type: Date, required: true, index: true },
  homeTeam: {
    id: String,
    name: String,
  },
  awayTeam: {
    id: String,
    name: String,
  },
  status: {
    short: { type: String, required: true, index: true },
    long: String,
  },
  score: {
    home: Number,
    away: Number,
  },
}, { timestamps: true });

export const Match = mongoose.models.Match || mongoose.model('Match', matchSchema);
export default Match;
