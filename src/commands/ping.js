import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check the bot latency and responsiveness.'),

  async execute(interaction) {
    const latency = Date.now() - interaction.createdTimestamp;
    const websocketPing = interaction.client.ws.ping;

    const embed = new EmbedBuilder()
      .setColor('#2ECC71')
      .setTitle('🏓 Pong')
      .addFields(
        { name: 'API latency', value: `${latency} ms`, inline: true },
        { name: 'WebSocket', value: `${websocketPing} ms`, inline: true }
      );

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
