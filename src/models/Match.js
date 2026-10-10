import mongoose from 'mongoose';

const matchSchema = new mongoose.Schema({
  fixtureId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  leagueName: String,
  country: String,
  season: Number,
  kickoffAt: Date,
  homeTeam: {
    id: String,
    name: String,
  },
  awayTeam: {
    id: String,
    name: String,
  },
  status: String,
  score: {
    home: Number,
    away: Number,
  },
  providerData: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export const Match = mongoose.models.Match || mongoose.model('Match', matchSchema);
export default Match;
