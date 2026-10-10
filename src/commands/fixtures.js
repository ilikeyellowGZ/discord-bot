import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

import { footballApiService } from '../services/footballApiService.js';

function formatFixtureTime(dateString) {
  return new Intl.DateTimeFormat('en-ZA', {
    timeZone: 'Africa/Johannesburg',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(dateString));
}

export default {
  data: new SlashCommandBuilder()
    .setName('fixtures')
    .setDescription('List upcoming football fixtures.'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const fixtures = await footballApiService.getUpcomingFixtures(5);

    if (!fixtures || fixtures.length === 0) {
      await interaction.editReply('No fixtures were available for the next window.');
      return;
    }

    const embed = new EmbedBuilder()
      .setColor('#E74C3C')
      .setTitle('📅 Upcoming fixtures');

    fixtures.forEach((fixture) => {
      const home = fixture.teams?.home?.name || 'Home';
      const away = fixture.teams?.away?.name || 'Away';
      const kickoff = fixture.fixture?.date || new Date().toISOString();
      embed.addFields({
        name: `${home} vs ${away}`,
        value: `${fixture.league?.name || 'Competition'} • ${formatFixtureTime(kickoff)}`,
      });
    });

    await interaction.editReply({ embeds: [embed] });
  },
};
