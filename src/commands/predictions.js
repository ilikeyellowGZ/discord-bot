import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

import { generatePredictionSummary } from '../services/predictionEngine.js';

export default {
  data: new SlashCommandBuilder()
    .setName('predictions')
    .setDescription('Display the best available football predictions for the day.'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const samples = [
      { home: 'Manchester City', away: 'Arsenal', homeLambda: 1.9, awayLambda: 1.2 },
      { home: 'Real Madrid', away: 'Barcelona', homeLambda: 1.7, awayLambda: 1.5 },
      { home: 'Inter Milan', away: 'Juventus', homeLambda: 1.4, awayLambda: 1.1 },
    ];

    const embed = new EmbedBuilder()
      .setColor('#F39C12')
      .setTitle('📈 Today\'s predictions');

    samples.forEach(({ home, away, homeLambda, awayLambda }, index) => {
      const summary = generatePredictionSummary(home, away, homeLambda, awayLambda);
      embed.addFields({
        name: `${home} vs ${away}`,
        value: `Home ${((summary.markets.homeWin) * 100).toFixed(1)}% • Draw ${(summary.markets.draw * 100).toFixed(1)}% • Away ${(summary.markets.awayWin * 100).toFixed(1)}%`,
      });

      if (index === samples.length - 1) {
        embed.setFooter({ text: `Model: ${summary.modelVersion}` });
      }
    });

    await interaction.editReply({ embeds: [embed] });
  },
};
