import mongoose from 'mongoose';

const predictionSnapshotSchema = new mongoose.Schema({
  matchId: {
    type: String,
    required: true,
    index: true,
  },
  homeTeamId: { type: String, required: true, index: true },
  awayTeamId: { type: String, required: true, index: true },
  modelVersion: String,
  predictionTimestamp: Date,
  probabilities: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  distribution: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  dataCoverage: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  features: { type: mongoose.Schema.Types.Mixed, default: {} },
  missingInputs: [String],
  limitations: [String],
}, { timestamps: true });

predictionSnapshotSchema.index({ matchId: 1, modelVersion: 1, predictionTimestamp: 1 }, { unique: true });

export const PredictionSnapshot = mongoose.models.PredictionSnapshot || mongoose.model('PredictionSnapshot', predictionSnapshotSchema);
export default PredictionSnapshot;
