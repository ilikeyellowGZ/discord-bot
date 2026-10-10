import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

import { generatePredictionSummary } from '../services/predictionEngine.js';

export default {
  data: new SlashCommandBuilder()
    .setName('analyse')
    .setDescription('Analyse a football match using the current statistical model.')
    .addStringOption((option) => option.setName('match').setDescription('Match identifier or short label').setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const requestedMatch = interaction.options.getString('match') || 'Manchester City vs Arsenal';
    const homeTeam = requestedMatch.includes('vs') ? requestedMatch.split('vs')[0].trim() : 'Manchester City';
    const awayTeam = requestedMatch.includes('vs') ? requestedMatch.split('vs')[1].trim() : 'Arsenal';

    const summary = generatePredictionSummary(homeTeam, awayTeam, 1.8, 1.3);
    const embed = new EmbedBuilder()
      .setColor('#9B59B6')
      .setTitle(`📊 Match analysis: ${summary.teams.home} vs ${summary.teams.away}`)
      .addFields(
        { name: 'Home win', value: `${(summary.markets.homeWin * 100).toFixed(1)}%`, inline: true },
        { name: 'Draw', value: `${(summary.markets.draw * 100).toFixed(1)}%`, inline: true },
        { name: 'Away win', value: `${(summary.markets.awayWin * 100).toFixed(1)}%`, inline: true },
        { name: 'BTTS', value: `${(summary.markets.bothTeamsToScore.yes * 100).toFixed(1)}%`, inline: true },
        { name: 'Over 2.5', value: `${(summary.markets.totals.over25 * 100).toFixed(1)}%`, inline: true },
        { name: 'Top scoreline', value: summary.summary.highestProbabilityScore?.score || '1-1', inline: true }
      );

    await interaction.editReply({ embeds: [embed] });
  },
};
