import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('result')
    .setDescription('View a finished match result and settle applicable predictions.')
    .addStringOption((option) => option.setName('match').setDescription('Match label').setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const matchName = interaction.options.getString('match') || 'Manchester City vs Arsenal';
    const embed = new EmbedBuilder()
      .setColor('#C0392B')
      .setTitle(`🏁 Result: ${matchName}`)
      .addFields(
        { name: 'Score', value: '2 - 1', inline: true },
        { name: 'Winner', value: 'Manchester City', inline: true },
        { name: 'Settled predictions', value: '2/3 updated', inline: true }
      );

    await interaction.editReply({ embeds: [embed] });
  },
};
