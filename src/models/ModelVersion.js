import mongoose from 'mongoose';

const modelVersionSchema = new mongoose.Schema({
  version: {
    type: String,
    required: true,
    unique: true,
  },
  active: {
    type: Boolean,
    default: false,
  },
  description: String,
  metrics: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  createdAt: { type: Date, default: Date.now },
});

export const ModelVersion = mongoose.models.ModelVersion || mongoose.model('ModelVersion', modelVersionSchema);
export default ModelVersion;
