import mongoose from 'mongoose';

const botConfigurationSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
  },
  value: mongoose.Schema.Types.Mixed,
  updatedAt: { type: Date, default: Date.now },
});

export const BotConfiguration = mongoose.models.BotConfiguration || mongoose.model('BotConfiguration', botConfigurationSchema);
export default BotConfiguration;
