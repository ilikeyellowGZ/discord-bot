import { footballApiService } from '../services/footballApiService.js';
import { generatePredictionSummary } from '../services/predictionEngine.js';

const analysisState = {
  lastRunAt: null,
};

export async function runDailyAnalysis() {
  const fixtures = await footballApiService.getUpcomingFixtures(8);

  if (!fixtures || fixtures.length === 0) {
    console.log('No fixtures available for daily analysis.');
    return;
  }

  const summary = fixtures.slice(0, 3).map((fixture) => {
    const home = fixture.teams?.home?.name || 'Home';
    const away = fixture.teams?.away?.name || 'Away';
    const model = generatePredictionSummary(home, away, 1.6, 1.2);
    return {
      match: `${home} vs ${away}`,
      model,
    };
  });

  analysisState.lastRunAt = new Date();
  console.log(`Daily analysis ran for ${summary.length} fixtures.`);
  return summary;
}

export function startDailyAnalysisJob() {
  runDailyAnalysis().catch((error) => console.error('Daily analysis failed:', error.message));

  setInterval(() => {
    runDailyAnalysis().catch((error) => console.error('Daily analysis failed:', error.message));
  }, 60 * 60 * 1000);
}

export function getLastAnalysisTime() {
  return analysisState.lastRunAt;
}
