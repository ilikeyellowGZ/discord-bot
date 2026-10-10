import mongoose from 'mongoose';

const matchAnalysisSchema = new mongoose.Schema({
  matchId: { type: String, required: true, unique: true },
  modelVersion: String,
  predictionTimestamp: Date,
  kickoffAt: Date,
  homeTeam: String,
  awayTeam: String,
  predictions: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  features: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  dataCoverage: { type: mongoose.Schema.Types.Mixed, default: {} },
  limitations: [String],
}, { timestamps: true });

export const MatchAnalysis = mongoose.models.MatchAnalysis || mongoose.model('MatchAnalysis', matchAnalysisSchema);
export default MatchAnalysis;
