import { env } from '../config/env.js';
import PredictionSnapshot from '../models/PredictionSnapshot.js';
import { getBotConfiguration } from '../services/botConfigurationService.js';
import { postDailySummary } from '../services/dailyPostService.js';
import { syncFixtures } from '../services/fixtureRepository.js';
import { footballApiService } from '../services/footballApiService.js';
import { analyseFixture } from '../services/matchAnalysisService.js';
import { selectFixturesForAnalysis } from '../services/schedulingService.js';

const analysisState = { lastRunAt: null, lastSuccessfulAnalysisAt: null, running: false };

async function defaultLoadSnapshots(fixtures) {
  const ids = fixtures.map((item) => String(item.fixture.id));
  if (ids.length === 0) return [];
  return PredictionSnapshot.find({ matchId: { $in: ids } }).sort({ predictionTimestamp: -1 }).lean();
}

export async function runDailyAnalysis({
  client,
  now = () => new Date(),
  api = footballApiService,
  getConfiguration = getBotConfiguration,
  persistFixtures = syncFixtures,
  loadSnapshots = defaultLoadSnapshots,
  analyse = analyseFixture,
  postSummary = postDailySummary,
} = {}) {
  if (analysisState.running) return { status: 'already-running' };
  analysisState.running = true;
  try {
    const startedAt = now();
    const config = await getConfiguration();
    const favouriteTeamIds = config?.favouriteTeamIds ?? [];
    const fixtures = await api.getUpcomingFixtures(20, { favouriteTeamIds });
    await persistFixtures(fixtures, { now: startedAt });
    const snapshots = await loadSnapshots(fixtures);
    const eligible = selectFixturesForAnalysis(fixtures, snapshots, {
      now: startedAt,
      analysisHours: env.ANALYSIS_HOURS_BEFORE_KICKOFF,
      refreshHours: env.ANALYSIS_REFRESH_HOURS,
      favouriteTeamIds,
    });

    let analysed = 0;
    const failures = [];
    for (const fixture of eligible) {
      try {
        await analyse(Number(fixture.fixture.id));
        analysed += 1;
        analysisState.lastSuccessfulAnalysisAt = now();
      } catch (error) {
        failures.push({ fixtureId: String(fixture.fixture.id), code: error?.code ?? 'ANALYSIS_FAILED' });
      }
    }

    const post = await postSummary(client, config, {
      now: now(), timeZone: config?.timezone ?? env.TIMEZONE,
    });
    analysisState.lastRunAt = now();
    return {
      status: 'completed', fixtureCount: fixtures.length, eligible: eligible.length,
      analysed, failed: failures.length, failures, post,
    };
  } finally {
    analysisState.running = false;
  }
}

export function startDailyAnalysisJob(client, {
  intervalMinutes = env.SCHEDULER_INTERVAL_MINUTES,
  run = runDailyAnalysis,
} = {}) {
  const execute = () => run({ client }).catch((error) => {
    console.error(`Scheduled analysis cycle failed (${error?.code ?? 'JOB_ERROR'}).`);
  });
  void execute();
  return setInterval(execute, intervalMinutes * 60_000);
}

export function getAnalysisState() {
  return { ...analysisState };
}

export function getLastAnalysisTime() {
  return analysisState.lastSuccessfulAnalysisAt;
}
