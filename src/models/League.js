import mongoose from 'mongoose';

const leagueSchema = new mongoose.Schema({
  leagueId: { type: String, required: true, unique: true },
  name: String,
  country: String,
  type: String,
  season: Number,
}, { timestamps: true });

export const League = mongoose.models.League || mongoose.model('League', leagueSchema);
export default League;
