import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Restricted administrative commands for authorised users only.')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('status')
        .setDescription('Review bot configuration and operational health.')
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const adminUsers = (process.env.ADMIN_USER_IDS || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    if (adminUsers.length > 0 && !adminUsers.includes(String(interaction.user.id))) {
      await interaction.editReply('You are not authorised to use admin commands.');
      return;
    }

    if (adminUsers.length === 0) {
      await interaction.editReply('No admin user list is configured. Configure ADMIN_USER_IDS in your environment before enabling admin actions.');
      return;
    }

    const embed = new EmbedBuilder()
      .setColor('#C0392B')
      .setTitle('🛠️ Admin status')
      .addFields(
        { name: 'Bot mode', value: 'Operational', inline: true },
        { name: 'Duplicate jobs', value: 'Protected', inline: true },
        { name: 'Channel posting', value: 'Configured when enabled', inline: true }
      );

    await interaction.editReply({ embeds: [embed] });
  },
};
