import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('my')
    .setDescription('View your personally tracked bets.')
    .addSubcommand((subcommand) => subcommand.setName('bets').setDescription('Display tracked bets and their status.')),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const embed = new EmbedBuilder()
      .setColor('#7F8C8D')
      .setTitle('🎯 My bets')
      .addFields(
        { name: 'Manchester City vs Arsenal', value: 'Home Win • Odds 1.90 • Stake £10 • pending', inline: false },
        { name: 'Inter Milan vs Juventus', value: 'BTTS Yes • Odds 1.83 • Stake £8 • pending', inline: false }
      );

    await interaction.editReply({ embeds: [embed] });
  },
};
