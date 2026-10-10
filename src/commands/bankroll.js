import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('bankroll')
    .setDescription('Review bankroll summary, P/L and ROI.'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const embed = new EmbedBuilder()
      .setColor('#27AE60')
      .setTitle('💰 Bankroll summary')
      .addFields(
        { name: 'Current bankroll', value: '£240.00', inline: true },
        { name: 'Profit/Loss', value: '+£18.50', inline: true },
        { name: 'ROI', value: '+8.4%', inline: true },
        { name: 'Tracked bets', value: '6', inline: true }
      );

    await interaction.editReply({ embeds: [embed] });
  },
};
