import mongoose from 'mongoose';

const teamStatisticsSchema = new mongoose.Schema({
  teamId: { type: String, required: true, index: true },
  season: Number,
  homeForm: [Number],
  awayForm: [Number],
  xGFor: Number,
  xGAgainst: Number,
  goalsScored: Number,
  goalsConceded: Number,
  restDays: Number,
  fixtureCongestion: Number,
}, { timestamps: true });

export const TeamStatistics = mongoose.models.TeamStatistics || mongoose.model('TeamStatistics', teamStatisticsSchema);
export default TeamStatistics;
