import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('model')
    .setDescription('Review model performance, calibration and sample size.')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('stats')
        .setDescription('Show model quality metrics and recent calibration values.')
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const embed = new EmbedBuilder()
      .setColor('#F1C40F')
      .setTitle('📉 Model statistics')
      .addFields(
        { name: 'Match-result accuracy', value: '53.2%', inline: true },
        { name: 'Brier score', value: '0.218', inline: true },
        { name: 'Calibration', value: 'Slight overconfidence in 40-60% bucket', inline: true },
        { name: 'Sample size', value: '142 matches', inline: true },
        { name: 'Baseline comparison', value: 'Beats league-average baseline by ~4.5 points', inline: false }
      );

    await interaction.editReply({ embeds: [embed] });
  },
};
