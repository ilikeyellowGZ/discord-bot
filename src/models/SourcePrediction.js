import mongoose from 'mongoose';

const sourcePredictionSchema = new mongoose.Schema({
  sourceId: { type: String, required: true, index: true },
  matchId: { type: String, required: true, index: true },
  market: String,
  predictedOutcome: String,
  predictedScoreline: String,
  collectionTime: Date,
  articleUrl: String,
  collectionMethod: String,
}, { timestamps: true });

export const SourcePrediction = mongoose.models.SourcePrediction || mongoose.model('SourcePrediction', sourcePredictionSchema);
export default SourcePrediction;
