import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema({
  teamId: { type: String, required: true, unique: true },
  name: String,
  shortName: String,
  country: String,
  venue: String,
}, { timestamps: true });

export const Team = mongoose.models.Team || mongoose.model('Team', teamSchema);
export default Team;
