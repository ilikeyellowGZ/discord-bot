import { env } from '../config/env.js';

const fixtureCache = new Map();

function buildFallbackFixtures() {
  return [
    {
      fixture: {
        id: 101,
        timezone: 'Africa/Johannesburg',
        date: '2026-10-12T18:00:00+02:00',
        timestamp: 1760287200,
      },
      league: {
        name: 'Premier League',
        country: 'England',
        season: 2026,
      },
      teams: {
        home: { id: 1, name: 'Manchester City',
          logo: 'https://media.api-sports.io/football/teams/50.png' },
        away: { id: 2, name: 'Arsenal',
          logo: 'https://media.api-sports.io/football/teams/42.png' },
      },
      goals: { home: null, away: null },
      status: { short: 'NS' },
    },
    {
      fixture: {
        id: 102,
        timezone: 'Africa/Johannesburg',
        date: '2026-10-13T20:30:00+02:00',
        timestamp: 1760370600,
      },
      league: {
        name: 'La Liga',
        country: 'Spain',
        season: 2026,
      },
      teams: {
        home: { id: 3, name: 'Real Madrid',
          logo: 'https://media.api-sports.io/football/teams/541.png' },
        away: { id: 4, name: 'Barcelona',
          logo: 'https://media.api-sports.io/football/teams/529.png' },
      },
      goals: { home: null, away: null },
      status: { short: 'NS' },
    },
  ];
}

export class FootballApiService {
  constructor() {
    this.baseUrl = 'https://v3.football.api-sports.io';
    this.apiKey = env.API_FOOTBALL_KEY || '';
  }

  async request(path, params = {}, options = {}) {
    if (!this.apiKey) {
      return null;
    }

    const query = new URLSearchParams({ ...params }).toString();
    const cacheKey = `${path}?${query}`;

    if (fixtureCache.has(cacheKey) && !options.forceRefresh) {
      return fixtureCache.get(cacheKey);
    }

    const response = await fetch(`${this.baseUrl}${path}?${query}`, {
      headers: {
        'x-apisports-key': this.apiKey,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Football API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const payload = data.response ?? [];
    fixtureCache.set(cacheKey, payload);
    return payload;
  }

  async getUpcomingFixtures(limit = 8) {
    if (!this.apiKey) {
      return buildFallbackFixtures().slice(0, limit);
    }

    try {
      const fixtures = await this.request('/fixtures', {
        live: 'all',
        next: String(limit),
      });

      return fixtures ?? buildFallbackFixtures().slice(0, limit);
    } catch (error) {
      console.warn('Football API unavailable. Using fallback fixtures:', error.message);
      return buildFallbackFixtures().slice(0, limit);
    }
  }

  async getMatchById(matchId) {
    if (!this.apiKey) {
      const fallback = buildFallbackFixtures().find((fixture) => fixture.fixture.id === Number(matchId));
      return fallback ?? null;
    }

    try {
      const fixtures = await this.request('/fixtures', { id: String(matchId) });
      return fixtures?.[0] ?? null;
    } catch (error) {
      console.warn(`Unable to fetch match ${matchId}:`, error.message);
      return null;
    }
  }
}

export const footballApiService = new FootballApiService();
export default footballApiService;
