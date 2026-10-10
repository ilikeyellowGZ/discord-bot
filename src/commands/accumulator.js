import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

import { getDatabaseStatus } from '../db/connect.js';
import { buildAccumulatorSelections } from '../services/accumulatorService.js';
import { loadTodayPredictions } from '../services/predictionFeedService.js';
import { selectBestMarkets, selectTeamWins } from '../services/predictionSelectionService.js';

const EMPTY_MESSAGE = 'There are no saved pre-match predictions for today. Run `/analyse` on eligible fixtures first.';

function formatAccumulator(accumulator) {
  if (accumulator.legs.length < 2) return 'Not enough qualifying independent legs; no accumulator was forced.';
  const legs = accumulator.legs.map((leg, index) =>
    `${index + 1}. ${leg.match} — ${leg.selection} (${(leg.probability * 100).toFixed(1)}%)`).join('\n');
  return [
    legs,
    `Combined estimate: ${(accumulator.combinedProbability * 100).toFixed(2)}%`,
    `Weakest leg: ${accumulator.weakestLeg.selection} at ${(accumulator.weakestLeg.probability * 100).toFixed(1)}%`,
  ].join('\n');
}

export function createAccumulatorCommand({ load = loadTodayPredictions, databaseStatus = getDatabaseStatus } = {}) {
  return {
    data: new SlashCommandBuilder()
      .setName('accumulator')
      .setDescription('Build conservative and team-win accumulators from saved predictions.'),

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

      const conservative = buildAccumulatorSelections(selectBestMarkets(cards), { maxLegs: 7, minProbability: 0.6 });
      const teamWins = buildAccumulatorSelections(selectTeamWins(cards), { maxLegs: 7, minProbability: 0.55 });
      const embed = new EmbedBuilder()
        .setColor('#00A8E8')
        .setTitle('🧮 Probability-based accumulators')
        .setDescription('Adding legs reduces the chance of the whole slip winning. No selection is safe and no bet has been placed.')
        .addFields(
          { name: 'Conservative multi-market', value: formatAccumulator(conservative) },
          { name: 'Team-win accumulator', value: formatAccumulator(teamWins) },
          {
            name: 'Why these could fail',
            value: 'Football outcomes have high variance; missing inputs and model error affect every leg. Cross-match independence is assumed, not proven.',
          }
        )
        .setFooter({ text: conservative.correlationPolicy });
      await interaction.editReply({ embeds: [embed] });
    },
  };
}

export default createAccumulatorCommand();
