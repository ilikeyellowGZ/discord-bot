import { env } from '../config/env.js';
import Match from '../models/Match.js';
import PredictionSnapshot from '../models/PredictionSnapshot.js';

export function buildPredictionCards(matches, snapshots) {
  return matches.flatMap((match) => {
    const kickoff = new Date(match.kickoffAt);
    const eligible = snapshots
      .filter((snapshot) => String(snapshot.matchId) === String(match.fixtureId)
        && new Date(snapshot.predictionTimestamp) < kickoff)
      .sort((left, right) => new Date(right.predictionTimestamp) - new Date(left.predictionTimestamp));
    if (eligible.length === 0) return [];
    return [{
      matchId: String(match.fixtureId),
      match: {
        kickoffAt: kickoff,
        leagueName: match.league?.name ?? 'Unknown competition',
        homeTeam: match.homeTeam?.name ?? 'Home team',
        awayTeam: match.awayTeam?.name ?? 'Away team',
      },
      snapshot: eligible[0],
    }];
  });
}

function johannesburgDayRange(now) {
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: env.TIMEZONE || 'Africa/Johannesburg', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
  return {
    start: new Date(`${date}T00:00:00+02:00`),
    end: new Date(`${date}T23:59:59.999+02:00`),
  };
}

export async function loadTodayPredictions({
  now = new Date(), matchModel = Match, snapshotModel = PredictionSnapshot,
} = {}) {
  const { start, end } = johannesburgDayRange(now);
  const matches = await matchModel.find({
    kickoffAt: { $gte: start, $lte: end },
    'status.short': { $in: ['NS', 'TBD'] },
  }).sort({ kickoffAt: 1 }).lean();
  if (matches.length === 0) return [];
  const snapshots = await snapshotModel.find({
    matchId: { $in: matches.map((match) => String(match.fixtureId)) },
  }).sort({ predictionTimestamp: -1 }).lean();
  return buildPredictionCards(matches, snapshots);
}
