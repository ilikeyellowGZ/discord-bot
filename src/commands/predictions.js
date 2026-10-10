import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

import { getDatabaseStatus } from '../db/connect.js';
import { loadTodayPredictions } from '../services/predictionFeedService.js';

const percent = (value) => `${(value * 100).toFixed(1)}%`;
const EMPTY_MESSAGE = 'There are no saved pre-match predictions for today. Run `/analyse` on eligible fixtures first.';

export function createPredictionsCommand({ load = loadTodayPredictions, databaseStatus = getDatabaseStatus } = {}) {
  return {
    data: new SlashCommandBuilder()
      .setName('predictions')
      .setDescription('Display today’s saved pre-match model predictions.'),

    async execute(interaction) {
      await interaction.deferReply({ ephemeral: true });
      if (!databaseStatus().connected) {
        await interaction.editReply('Saved predictions are temporarily unavailable because the database is unavailable.');
        return;
      }
      const cards = await load();
      if (cards.length === 0) {
        await interaction.editReply(EMPTY_MESSAGE);
        return;
      }

      const fields = cards.slice(0, 20).map((card) => {
        const p = card.snapshot.probabilities;
        const topScore = p.exactScorelines?.[0];
        return {
          name: `${card.match.homeTeam} vs ${card.match.awayTeam}`,
          value: [
            `${card.match.leagueName} • ${card.match.kickoffAt.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Johannesburg' })}`,
            `Home ${percent(p.homeWin)} • Draw ${percent(p.draw)} • Away ${percent(p.awayWin)}`,
            topScore ? `Top score: ${topScore.score} (${percent(topScore.probability)})` : null,
            `Model: ${card.snapshot.modelVersion}`,
          ].filter(Boolean).join('\n'),
        };
      });
      const embed = new EmbedBuilder()
        .setColor('#F39C12')
        .setTitle('📈 Today’s model predictions')
        .setDescription('Saved pre-match model estimates. They are not bookmaker odds or guarantees.')
        .addFields(fields)
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
    },
  };
}

export default createPredictionsCommand();
