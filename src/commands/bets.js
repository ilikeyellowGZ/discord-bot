import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

import { getDatabaseStatus } from '../db/connect.js';
import { loadTodayPredictions } from '../services/predictionFeedService.js';
import { selectBestMarkets } from '../services/predictionSelectionService.js';

const EMPTY_MESSAGE = 'There are no saved pre-match predictions for today. Run `/analyse` on eligible fixtures first.';

export function createBetsCommand({ load = loadTodayPredictions, databaseStatus = getDatabaseStatus } = {}) {
  return {
    data: new SlashCommandBuilder()
      .setName('bets')
      .setDescription('Probability-based selections from saved model snapshots.')
      .addSubcommand((subcommand) => subcommand
        .setName('today')
        .setDescription('Show today’s highest-qualified model selections.')),

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
      const selections = selectBestMarkets(cards).slice(0, 20);
      if (selections.length === 0) {
        await interaction.editReply('Saved predictions exist, but none meet the configured probability and sample-size thresholds. No selections were forced.');
        return;
      }

      const embed = new EmbedBuilder()
        .setColor('#2ECC71')
        .setTitle('💡 Qualified selections today')
        .setDescription('Probability-based research only. No odds are available and no bet has been placed.')
        .addFields(selections.map((item) => ({
          name: `${item.match} • ${item.selection}`,
          value: [
            `${item.market} • Model probability: ${(item.probability * 100).toFixed(1)}%`,
            item.reason,
            `Risk: ${item.keyRisks[0]}`,
            `External support: ${item.externalSourceSupport ? 'Yes' : 'Not checked'}`,
          ].join('\n'),
        })))
        .setFooter({ text: 'One selection per match; incomplete data is disclosed rather than filled in.' });
      await interaction.editReply({ embeds: [embed] });
    },
  };
}

export default createBetsCommand();
