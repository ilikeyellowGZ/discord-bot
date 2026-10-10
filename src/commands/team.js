import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('team')
    .setDescription('Inspect a team\'s current form and upcoming fixtures.')
    .addStringOption((option) => option.setName('team').setDescription('Team name to inspect').setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const teamName = interaction.options.getString('team');
    const embed = new EmbedBuilder()
      .setColor('#8E44AD')
      .setTitle(`📋 Team profile: ${teamName}`)
      .addFields(
        { name: 'Recent form', value: 'WWDLW', inline: true },
        { name: 'Expected goals', value: '1.82 xG', inline: true },
        { name: 'Upcoming fixtures', value: '3 matches in 10 days', inline: true },
        { name: 'Key risk', value: 'Fixture congestion and slight injury exposure.', inline: false }
      );

    await interaction.editReply({ embeds: [embed] });
  },
};
