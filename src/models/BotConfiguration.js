import mongoose from 'mongoose';

const botConfigurationSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
  },
  value: mongoose.Schema.Types.Mixed,
  dailyPostChannelId: { type: String, default: null },
  dailyPostTime: { type: String, default: '08:00' },
  timezone: { type: String, default: 'Africa/Johannesburg' },
  favouriteTeamIds: { type: [String], default: [] },
  lastDailyPostDate: String,
  lastDailyPostAt: Date,
  dailyPostClaimDate: String,
  dailyPostClaimToken: String,
  dailyPostClaimedAt: Date,
  updatedAt: { type: Date, default: Date.now },
});

export const BotConfiguration = mongoose.models.BotConfiguration || mongoose.model('BotConfiguration', botConfigurationSchema);
export default BotConfiguration;
