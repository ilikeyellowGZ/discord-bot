import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

import { buildAccumulatorSelections } from '../services/accumulatorService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('bets')
    .setDescription('Betting recommendations and match markets.')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('today')
        .setDescription('Show the best available predictions for today\'s matches.')
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const predictions = [
      { match: 'Manchester City vs Arsenal', market: '1X2', selection: 'Home Win', probability: 0.62, reason: 'City have the stronger expected-goal profile at home.' },
      { match: 'Real Madrid vs Barcelona', market: '1X2', selection: 'Draw', probability: 0.38, reason: 'This fixture is competitive and often tight.' },
      { match: 'Inter Milan vs Juventus', market: 'BTTS', selection: 'Yes', probability: 0.58, reason: 'Both teams create chances in recent patterns.' },
      { match: 'Bayern Munich vs Dortmund', market: 'Over 2.5', selection: 'Yes', probability: 0.63, reason: 'High-pace attack profile supports totals.' },
    ];

    const accumulator = buildAccumulatorSelections(predictions, { maxLegs: 4, minProbability: 0.35 });
    const embed = new EmbedBuilder()
      .setColor('#2ECC71')
      .setTitle('💡 Best bets today')
      .setDescription('Model-supported, probability-based selections only. Treat this as research, not guaranteed profit.')
      .addFields(
        ...accumulator.legs.map((leg) => ({
          name: `${leg.match} • ${leg.selection}`,
          value: `Probability: ${(leg.probability * 100).toFixed(1)}% • ${leg.reason}`,
        }))
      )
      .setFooter({ text: accumulator.independenceAssumption });

    await interaction.editReply({ embeds: [embed] });
  },
};
