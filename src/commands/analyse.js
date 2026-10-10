import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

import { getDatabaseStatus } from '../db/connect.js';
import { FootballApiError } from '../services/footballApiService.js';
import { analyseFixture, MatchAnalysisError } from '../services/matchAnalysisService.js';

const percentage = (value) => `${(value * 100).toFixed(1)}%`;

function analysisErrorMessage(error) {
  if (error.code === 'NOT_FOUND') return 'That fixture could not be found. Use `/fixtures` to get a current fixture ID.';
  if (error.code === 'NOT_UPCOMING') return 'Only fixtures that have not started can receive a pre-match analysis.';
  if (error.code === 'INCOMPLETE_FIXTURE') return 'The fixture is missing provider identifiers required for analysis.';
  if (error.code === 'INSUFFICIENT_DATA' || error.code === 'PROVIDER_ERROR') {
    return 'API-Football does not provide enough current-season statistics for this fixture on the configured subscription. No prediction was generated.';
  }
  if (error.code === 'RATE_LIMITED') return 'The football data provider rate limit has been reached. Please try again later.';
  return 'Live analysis data is temporarily unavailable. Please try again later.';
}

export function createAnalyseCommand({ analyse = analyseFixture, databaseStatus = getDatabaseStatus } = {}) {
  return {
    data: new SlashCommandBuilder()
      .setName('analyse')
      .setDescription('Analyse an upcoming fixture using the Poisson model.')
      .addIntegerOption((option) => option
        .setName('fixture_id')
        .setDescription('API-Football fixture ID shown by /fixtures')
        .setMinValue(1)
        .setRequired(true)),

    async execute(interaction) {
      await interaction.deferReply({ ephemeral: true });
      if (!databaseStatus().connected) {
        await interaction.editReply('Analysis is temporarily unavailable because prediction snapshots cannot be saved to the database.');
        return;
      }

      let result;
      try {
        result = await analyse(interaction.options.getInteger('fixture_id'));
      } catch (error) {
        if (error instanceof MatchAnalysisError || error instanceof FootballApiError) {
          await interaction.editReply(analysisErrorMessage(error));
          return;
        }
        throw error;
      }

      const scores = result.markets.exactScorelines
        .map(({ score, probability }) => `${score} — ${percentage(probability)}`)
        .join('\n');
      const embed = new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle(`📊 ${result.match.homeTeam} vs ${result.match.awayTeam}`)
        .setDescription('Model probabilities only — not bookmaker odds or a guarantee.')
        .addFields(
          {
            name: 'Match result',
            value: `Home ${percentage(result.markets.homeWin)} • Draw ${percentage(result.markets.draw)} • Away ${percentage(result.markets.awayWin)}`,
          },
          {
            name: 'Projected goals',
            value: `${result.match.homeTeam} ${result.expectedGoals.home.toFixed(2)} • ${result.match.awayTeam} ${result.expectedGoals.away.toFixed(2)}`,
          },
          { name: 'BTTS — Yes', value: percentage(result.markets.bothTeamsToScore.yes), inline: true },
          { name: 'Over 2.5', value: percentage(result.markets.totals.over25), inline: true },
          { name: 'League sample', value: `${result.dataCoverage.leagueMatchSample} completed matches`, inline: true },
          { name: 'Top scorelines', value: scores },
          { name: 'Data gaps', value: result.dataCoverage.missing.join(', ') || 'None reported' },
          { name: 'Model limitation', value: result.limitations[0] }
        )
        .setFooter({ text: `${result.modelVersion} • Fixture ${result.match.fixtureId}` })
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
    },
  };
}

export default createAnalyseCommand();
