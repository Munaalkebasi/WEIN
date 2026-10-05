import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { handleDiscoveryRequest } from './api-handler.js';

const originalFetch = globalThis.fetch;
const originalKey = process.env.TICKETMASTER_API_KEY;
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.TICKETMASTER_API_KEY;
  else process.env.TICKETMASTER_API_KEY = originalKey;
});

const search = (body: unknown) => handleDiscoveryRequest({
  method: 'POST', pathname: '/api/discovery/search', body,
});

function event(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id, name: id, dates: { start: { dateTime: '2027-01-01T20:00:00Z' }, status: { code: 'onsale' } },
    priceRanges: [{ min: 10, max: 20, currency: 'CAD' }],
    _embedded: { venues: [{ location: { latitude: '49', longitude: '-123' } }] },
    ...overrides,
  };
}

test('rejects malformed search inputs before calling the provider', async () => {
  let called = false;
  globalThis.fetch = async () => { called = true; throw new Error('unexpected request'); };
  for (const body of [null, [], 'music', { prompt: 42 }, { prompt: ' ' },
    { latitude: 91, longitude: 0 }, { latitude: 49 }, { limit: -1 }, { limit: 21 },
    { limit: 1.5 }, { freeOnly: 'false' }, { radiusKm: 0 }, { maxPrice: -5 },
    { startDate: 'tomorrow' }, { startDate: '2027-02-01T00:00:00Z', endDate: '2027-01-01T00:00:00Z' },
    { minPrice: 30, maxPrice: 20 }, { sort: 'random' }]) {
    assert.equal((await search(body)).status, 400, JSON.stringify(body));
  }
  assert.equal(called, false);
});

test('returns actionable configuration and provider errors', async () => {
  delete process.env.TICKETMASTER_API_KEY;
  assert.equal((await search({ query: 'music' })).status, 503);
  process.env.TICKETMASTER_API_KEY = 'test-key';
  for (const status of [429, 500]) {
    globalThis.fetch = async () => new Response('unavailable', { status });
    const result = await search({});
    assert.equal(result.status, 502);
    assert.equal(JSON.stringify(result.body).includes('test-key'), false);
  }
  globalThis.fetch = async (_url, options) => {
    assert.ok(options?.signal);
    throw new DOMException('Timed out', 'TimeoutError');
  };
  assert.equal((await search({})).status, 502);
});

test('maps a missing Ticketmaster event to 404', async () => {
  process.env.TICKETMASTER_API_KEY = 'test-key';
  globalThis.fetch = async () => new Response('', { status: 404 });
  const result = await handleDiscoveryRequest({ method: 'GET', pathname: '/api/discovery/event/missing' });
  assert.equal(result.status, 404);
  assert.equal((result.body as { code: string }).code, 'not_found');
});

test('filters cancelled, expensive, and distant events and honors limits', async () => {
  process.env.TICKETMASTER_API_KEY = 'test-key';
  globalThis.fetch = async () => Response.json({ _embedded: { events: [
    event('ok'), event('cancelled', { dates: { status: { code: 'cancelled' } } }),
    event('expensive', { priceRanges: [{ min: 50 }] }),
    event('distant', { _embedded: { venues: [{ location: { latitude: '50', longitude: '-123' } }] } }),
    event('also-ok'),
  ] } });
  const result = await search({ latitude: 49, longitude: -123, radiusKm: 10, maxPrice: 20, limit: 1 });
  assert.equal(result.status, 200);
  assert.deepEqual((result.body as { events: { providerId: string }[] }).events.map(e => e.providerId), ['ok']);
});

test('honors date and distance sorting even when provider results are unordered', async () => {
  process.env.TICKETMASTER_API_KEY = 'test-key';
  globalThis.fetch = async (url) => {
    assert.match(String(url), /sort=(date|distance)%2Casc/);
    return Response.json({ _embedded: { events: [
      event('later-farther', { dates: { start: { dateTime: '2027-02-01T00:00:00Z' } },
        _embedded: { venues: [{ location: { latitude: '49.1', longitude: '-123' } }] } }),
      event('earlier-nearer'),
    ] } });
  };
  for (const sort of ['date', 'distance']) {
    const result = await search({ sort, latitude: 49, longitude: -123 });
    assert.equal(result.status, 200);
    assert.equal((result.body as { events: { providerId: string }[] }).events[0].providerId, 'earlier-nearer');
  }
});

test('supports empty results and free-only searches', async () => {
  process.env.TICKETMASTER_API_KEY = 'test-key';
  globalThis.fetch = async () => Response.json({});
  const empty = await search({});
  assert.equal(empty.status, 200);
  assert.deepEqual((empty.body as { events: unknown[] }).events, []);
  globalThis.fetch = async () => Response.json({ _embedded: { events: [event('paid'), event('free', { priceRanges: [{ min: 0, max: 0 }] }), event('unknown', { priceRanges: [] })] } });
  const result = await search({ freeOnly: true });
  assert.deepEqual((result.body as { events: { providerId: string }[] }).events.map(e => e.providerId), ['free']);
});
