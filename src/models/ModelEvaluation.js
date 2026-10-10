import mongoose from 'mongoose';

const modelEvaluationSchema = new mongoose.Schema({
  modelVersion: String,
  evaluationDate: Date,
  sampleSize: Number,
  resultAccuracy: Number,
  brierScore: Number,
  calibration: mongoose.Schema.Types.Mixed,
  baselineComparison: String,
}, { timestamps: true });

export const ModelEvaluation = mongoose.models.ModelEvaluation || mongoose.model('ModelEvaluation', modelEvaluationSchema);
export default ModelEvaluation;
