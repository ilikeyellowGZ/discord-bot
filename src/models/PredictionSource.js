import mongoose from 'mongoose';

const predictionSourceSchema = new mongoose.Schema({
  sourceName: { type: String, required: true },
  sourceType: String,
  websiteUrl: String,
  active: { type: Boolean, default: true },
  notes: String,
}, { timestamps: true });

export const PredictionSource = mongoose.models.PredictionSource || mongoose.model('PredictionSource', predictionSourceSchema);
export default PredictionSource;
