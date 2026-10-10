import MatchAnalysis from '../models/MatchAnalysis.js';
import PredictionSnapshot from '../models/PredictionSnapshot.js';
import { footballApiService } from './footballApiService.js';
import {
  buildExactScoreDistribution,
  calculateLeagueGoalAverages,
  calculateMarketsFromDistribution,
  estimateExpectedGoals,
} from './predictionEngine.js';

const MODEL_VERSION = 'poisson-v1.1';
const UPCOMING_STATUSES = new Set(['NS', 'TBD']);

export class MatchAnalysisError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'MatchAnalysisError';
    this.code = code;
  }
}

function dateOnly(date) {
  return date.toISOString().slice(0, 10);
}

export async function analyseFixture(fixtureId, {
  api = footballApiService,
  now = () => new Date(),
  analysisModel = MatchAnalysis,
  snapshotModel = PredictionSnapshot,
} = {}) {
  const predictionTimestamp = now();
  const fixture = await api.getMatchById(fixtureId);
  if (!fixture) throw new MatchAnalysisError('Fixture was not found.', 'NOT_FOUND');

  const kickoffAt = new Date(fixture?.fixture?.date);
  const status = fixture?.fixture?.status?.short;
  if (!UPCOMING_STATUSES.has(status) || Number.isNaN(kickoffAt.getTime()) || kickoffAt <= predictionTimestamp) {
    throw new MatchAnalysisError('Only upcoming fixtures can be analysed.', 'NOT_UPCOMING');
  }

  const leagueId = Number(fixture?.league?.id);
  const season = Number(fixture?.league?.season);
  const homeTeamId = Number(fixture?.teams?.home?.id);
  const awayTeamId = Number(fixture?.teams?.away?.id);
  if ([leagueId, season, homeTeamId, awayTeamId].some((value) => !Number.isInteger(value) || value <= 0)) {
    throw new MatchAnalysisError('Fixture is missing provider identifiers required for analysis.', 'INCOMPLETE_FIXTURE');
  }

  const asOf = dateOnly(predictionTimestamp);
  const [homeStats, awayStats, completedFixtures] = await Promise.all([
    api.getTeamStatistics({ leagueId, season, teamId: homeTeamId, asOf }),
    api.getTeamStatistics({ leagueId, season, teamId: awayTeamId, asOf }),
    api.getCompletedLeagueFixtures({ leagueId, season, asOf }),
  ]);
  if (!homeStats?.fixtures || !awayStats?.fixtures) {
    throw new MatchAnalysisError('The provider does not have enough team statistics for this fixture.', 'INSUFFICIENT_DATA');
  }

  const leagueAverages = calculateLeagueGoalAverages(completedFixtures);
  const expectedGoals = estimateExpectedGoals({ homeStats, awayStats, leagueAverages });
  const distribution = buildExactScoreDistribution(expectedGoals.home, expectedGoals.away);
  const markets = calculateMarketsFromDistribution(distribution, {
    homeLambda: expectedGoals.home,
    awayLambda: expectedGoals.away,
  });
  const dataCoverage = {
    available: ['home/away goals', 'league scoring averages', 'recent form'],
    missing: ['xG/xGA', 'confirmed absences', 'confirmed lineups', 'rest and congestion'],
    leagueMatchSample: leagueAverages.sampleSize,
    homeMatchSample: expectedGoals.features.homeMatches,
    awayMatchSample: expectedGoals.features.awayMatches,
  };
  if (leagueAverages.sampleSize === 0) dataCoverage.missing.push('observed league scoring average');
  const limitations = [
    'Independent Poisson goals assumption does not model score-state effects or correlation.',
    'Unavailable inputs are disclosed and do not receive invented adjustments.',
    'Probabilities are model estimates, not guarantees or bookmaker odds.',
  ];
  const match = {
    fixtureId: String(fixture.fixture.id),
    kickoffAt,
    leagueId: String(leagueId),
    leagueName: fixture.league.name,
    homeTeamId: String(homeTeamId),
    homeTeam: fixture.teams.home.name,
    awayTeamId: String(awayTeamId),
    awayTeam: fixture.teams.away.name,
  };
  const result = {
    modelVersion: MODEL_VERSION,
    predictionTimestamp,
    match,
    expectedGoals: { home: expectedGoals.home, away: expectedGoals.away },
    distribution,
    markets,
    features: expectedGoals.features,
    dataCoverage,
    limitations,
  };

  await snapshotModel.create({
    matchId: match.fixtureId,
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    modelVersion: MODEL_VERSION,
    predictionTimestamp,
    probabilities: markets,
    distribution,
    features: expectedGoals.features,
    dataCoverage,
    missingInputs: dataCoverage.missing,
    limitations,
  });
  await analysisModel.updateOne(
    { matchId: match.fixtureId },
    { $set: {
      modelVersion: MODEL_VERSION,
      predictionTimestamp,
      kickoffAt,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      predictions: { expectedGoals: result.expectedGoals, markets, distribution },
      features: expectedGoals.features,
      dataCoverage,
      limitations,
    } },
    { upsert: true }
  );
  return result;
}
