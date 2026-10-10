import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

import { buildAccumulatorSelections } from '../services/accumulatorService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('accumulator')
    .setDescription('Generate a conservative accumulator from model-supported selections.'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const predictions = [
      { match: 'Manchester City vs Arsenal', market: '1X2', selection: 'Home Win', probability: 0.62, reason: 'Home expected-goals edge and stronger pattern support.' },
      { match: 'Inter Milan vs Juventus', market: '1X2', selection: 'Home Win', probability: 0.55, reason: 'Home side has stronger recent form and structure.' },
      { match: 'PSG vs Marseille', market: 'Over 2.5', selection: 'Yes', probability: 0.57, reason: 'Both should create enough chances to trade above 2.5 goals.' },
      { match: 'Benfica vs Porto', market: 'BTTS', selection: 'Yes', probability: 0.53, reason: 'Both teams record enough shots and chances.' },
      { match: 'Napoli vs Lazio', market: 'Draw No Bet', selection: 'Napoli', probability: 0.52, reason: 'Napoli have a stronger home profile than the market is implying.' },
    ];

    const accumulator = buildAccumulatorSelections(predictions, { maxLegs: 5, minProbability: 0.5 });
    const embed = new EmbedBuilder()
      .setColor('#00A8E8')
      .setTitle('🧮 Conservative accumulator')
      .addFields(
        ...accumulator.legs.map((leg) => ({
          name: `${leg.match} • ${leg.selection}`,
          value: `Probability: ${(leg.probability * 100).toFixed(1)}% • Key risk: ${leg.keyRisks[0]}`,
        }))
      )
      .setFooter({ text: `Combined probability (illustrative, independent legs): ${(accumulator.conservativeProbability * 100).toFixed(1)}%.` });

    await interaction.editReply({ embeds: [embed] });
  },
};
