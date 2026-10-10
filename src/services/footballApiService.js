import { env } from '../config/env.js';

const API_BASE_URL = 'https://v3.football.api-sports.io';
const ALLOWED_PATHS = new Set(['/fixtures', '/status']);
const defaultSleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export class FootballApiError extends Error {
  constructor(message, { code = 'API_ERROR', status = null, retryable = false } = {}) {
    super(message);
    this.name = 'FootballApiError';
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

function hasProviderErrors(errors) {
  if (Array.isArray(errors)) return errors.length > 0;
  if (errors && typeof errors === 'object') return Object.keys(errors).length > 0;
  return Boolean(errors);
}

function isTransientStatus(status) {
  return status === 429 || status === 499 || status >= 500;
}

function dateInTimeZone(timestamp, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function addCalendarDays(dateString, days) {
  const date = new Date(`${dateString}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export class FootballApiService {
  constructor({
    apiKey = env.API_FOOTBALL_KEY || '',
    timeZone = env.TIMEZONE || 'Africa/Johannesburg',
    fetchImpl = globalThis.fetch,
    cacheTtlMs = 5 * 60 * 1000,
    timeoutMs = 10_000,
    maxRetries = 2,
    sleep = defaultSleep,
    now = () => Date.now(),
  } = {}) {
    this.apiKey = apiKey;
    this.timeZone = timeZone;
    this.fetchImpl = fetchImpl;
    this.cacheTtlMs = cacheTtlMs;
    this.timeoutMs = timeoutMs;
    this.maxRetries = maxRetries;
    this.sleep = sleep;
    this.now = now;
    this.cache = new Map();
    this.inFlight = new Map();
    this.health = { lastSuccessfulRequestAt: null, rateLimitRemaining: null, lastErrorCode: null };
  }

  getHealth() {
    return { configured: Boolean(this.apiKey), ...this.health };
  }

  async request(path, params = {}, { forceRefresh = false } = {}) {
    if (!this.apiKey) {
      throw new FootballApiError('Football data provider is not configured.', { code: 'NOT_CONFIGURED' });
    }
    if (!ALLOWED_PATHS.has(path)) {
      throw new FootballApiError('Unsupported football data endpoint.', { code: 'INVALID_ENDPOINT' });
    }

    const url = new URL(path, API_BASE_URL);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }
    const cacheKey = url.toString();
    const cached = this.cache.get(cacheKey);
    if (!forceRefresh && cached && cached.expiresAt > this.now()) return cached.value;
    if (!forceRefresh && this.inFlight.has(cacheKey)) return this.inFlight.get(cacheKey);

    const pendingRequest = (async () => {
      for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      try {
        const response = await this.fetchImpl(url, {
          method: 'GET',
          headers: { Accept: 'application/json', 'x-apisports-key': this.apiKey },
          redirect: 'error',
          signal: AbortSignal.timeout(this.timeoutMs),
        });
        if (!response.ok) {
          const retryable = isTransientStatus(response.status);
          if (retryable && attempt < this.maxRetries) {
            await this.sleep(250 * (2 ** attempt));
            continue;
          }
          throw new FootballApiError('Football data provider request failed.', {
            code: response.status === 429 ? 'RATE_LIMITED' : 'HTTP_ERROR',
            status: response.status,
            retryable,
          });
        }

        const data = await response.json();
        if (hasProviderErrors(data.errors)) {
          throw new FootballApiError('Football data provider rejected the request.', { code: 'PROVIDER_ERROR' });
        }
        const value = Array.isArray(data.response) ? data.response : [];
        this.cache.set(cacheKey, { value, expiresAt: this.now() + this.cacheTtlMs });
        this.health = {
          lastSuccessfulRequestAt: new Date(this.now()),
          rateLimitRemaining: response.headers.get('x-ratelimit-requests-remaining'),
          lastErrorCode: null,
        };
        return value;
      } catch (error) {
        if (error instanceof FootballApiError) {
          this.health.lastErrorCode = error.code;
          throw error;
        }
        const retryable = ['AbortError', 'TimeoutError', 'TypeError'].includes(error?.name);
        if (retryable && attempt < this.maxRetries) {
          await this.sleep(250 * (2 ** attempt));
          continue;
        }
        const wrapped = new FootballApiError('Football data provider is temporarily unavailable.', {
          code: retryable ? 'UNAVAILABLE' : 'API_ERROR',
          retryable,
        });
        this.health.lastErrorCode = wrapped.code;
        throw wrapped;
      }
      }
      throw new FootballApiError('Football data provider is temporarily unavailable.', { code: 'UNAVAILABLE' });
    })();
    this.inFlight.set(cacheKey, pendingRequest);
    try {
      return await pendingRequest;
    } finally {
      this.inFlight.delete(cacheKey);
    }
  }

  async getUpcomingFixtures(limit = 10, options = {}) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
      throw new TypeError('Fixture limit must be an integer between 1 and 20.');
    }
    const now = this.now();
    const startDate = dateInTimeZone(now, this.timeZone);
    const upcoming = [];
    for (let dayOffset = 0; dayOffset < 3 && upcoming.length < limit; dayOffset += 1) {
      const fixtures = await this.request('/fixtures', {
        date: addCalendarDays(startDate, dayOffset),
        timezone: this.timeZone,
      }, options);
      upcoming.push(...fixtures.filter((item) => {
        const kickoff = Date.parse(item?.fixture?.date);
        const status = item?.fixture?.status?.short;
        return Number.isFinite(kickoff) && kickoff >= now && ['NS', 'TBD'].includes(status);
      }));
    }
    return upcoming
      .sort((left, right) => Date.parse(left.fixture.date) - Date.parse(right.fixture.date))
      .slice(0, limit);
  }

  async getMatchById(matchId, options = {}) {
    const normalizedId = Number(matchId);
    if (!Number.isInteger(normalizedId) || normalizedId <= 0) {
      throw new TypeError('Fixture ID must be a positive integer.');
    }
    const fixtures = await this.request('/fixtures', { id: normalizedId, timezone: this.timeZone }, options);
    return fixtures[0] ?? null;
  }
}

export const footballApiService = new FootballApiService();
export default footballApiService;
