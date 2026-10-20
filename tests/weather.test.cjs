const { test } = require('node:test');
const assert = require('node:assert/strict');
const { NextRequest } = require('next/server');
const { GET } = require('../.test-dist/api/weather/route.js');

const blobUrl = 'https://example.public.blob.vercel-storage.com/weather/scarborough-hourly.json';
const location = { name: 'Scarborough, Toronto, Ontario, Canada', postalCode: 'M1E4V4', latitude: 43.7729744, longitude: -79.2576479, timezone: 'America/Toronto' };
const row = (time) => ({ time, temp: -2, feelsLike: -5, condition: 'Partly cloudy', windSpeed: 10, windDirection: 'SE', windGust: 17, humidity: 45, precipProb: 0 });
const feed = (times = ['2026-10-20T12:00:00-04:00', '2026-10-20T13:00:00-04:00', '2026-10-20T14:00:00-04:00']) => ({ schemaVersion: 1, source: 'the-weather-network', sourceUrl: 'https://www.theweathernetwork.com/en/city/ca/ontario/scarborough/hourly', fetchedAt: '2026-10-20T16:10:00Z', location: { ...location }, hourly: times.map(row) });

async function request(t, data = feed(), query = '', now = '2026-10-20T16:25:00Z', failure = '') {
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse(now) });
  const previous = process.env.WEATHER_BLOB_URL;
  process.env.WEATHER_BLOB_URL = blobUrl;
  t.after(() => { t.mock.timers.reset(); if (previous === undefined) delete process.env.WEATHER_BLOB_URL; else process.env.WEATHER_BLOB_URL = previous; });
  t.mock.method(global, 'fetch', async (url) => {
    if (String(url) === blobUrl) {
      if (failure === 'offline') throw new Error('offline');
      if (failure === 'json') return new Response('{');
      return new Response(JSON.stringify(data), { status: failure === 'http' ? 503 : 200 });
    }
    assert.match(String(url), /^https:\/\/api\.open-meteo\.com\/v1\/forecast\?/);
    const params = new URL(url).searchParams;
    const offset = params.get('timezone') === 'Asia/Kolkata' ? 1800 : 0;
    const hour = Math.floor((Date.now() / 1000 + offset) / 3600) * 3600 - offset;
    const values = Array.from({ length: 48 }, (_, i) => i);
    return Response.json({ timezone: params.get('timezone') || 'America/Toronto', current: { time: Date.now() / 1000, temperature_2m: 7, apparent_temperature: 5, precipitation: 0, weather_code: 3, wind_speed_10m: 8, wind_direction_10m: 180, wind_gusts_10m: 16, relative_humidity_2m: 50 }, hourly: { time: values.map(i => params.get('timeformat') === 'unixtime' ? hour + i * 3600 : new Date((hour + i * 3600 - 4 * 3600) * 1000).toISOString().slice(0, 16)), temperature_2m: values.map(() => 9), apparent_temperature: values.map(() => 8), precipitation_probability: values.map(() => 20), precipitation: values.map(() => 0.2), weather_code: values.map(() => 3), wind_speed_10m: values.map(() => 12), wind_direction_10m: values.map(() => 180), wind_gusts_10m: values.map(() => 20), relative_humidity_2m: values.map(() => 60) } });
  });
  const params = new URLSearchParams(query);
  if (!params.has('hours')) params.set('hours', '2');
  const response = await GET(new NextRequest(`https://weather.example/api/weather?${params}`));
  assert.equal(response.status, 200);
  return response.json();
}

test('Scarborough uses validated feed without losing zero or negative values and keeps Open-Meteo current separate', async t => {
  const data = await request(t, feed(), 'postal=m1e%204v4&lat=43.7729744&lon=-79.2576479');
  assert.equal(data.hourlySource, 'the-weather-network');
  assert.equal(data.hourlyFetchedAt, '2026-10-20T16:10:00Z');
  assert.equal(data.hourlyFallbackReason, null);
  assert.deepEqual(data.hourly[0], { ...row('2026-10-20T12:00:00-04:00'), precip: null, conditionCode: null });
  assert.equal(data.currentSource, 'open-meteo');
  assert.equal(data.current.temp, 7);
});

test('explicit unavailable nulls survive; missing fields cannot masquerade as unavailable', async t => {
  const input = feed(); input.hourly[0].windGust = null; input.hourly[0].condition = null;
  const data = await request(t, input);
  assert.equal(data.hourlySource, 'the-weather-network');
  assert.equal(data.hourly[0].windGust, null);
  assert.equal(data.hourly[0].condition, null);
});

const invalidCases = [
  ['old feed', f => f.fetchedAt = '2026-10-20T14:54:00Z', 'stale'],
  ['future feed', f => f.fetchedAt = '2026-10-20T16:26:00Z', 'invalid'],
  ['wrong version', f => f.schemaVersion = 2, 'invalid'],
  ['wrong source', f => f.source = 'other', 'invalid'],
  ['wrong URL', f => f.sourceUrl = 'https://example.com', 'invalid'],
  ['wrong location', f => f.location.postalCode = 'OTHER', 'invalid'],
  ['wrong location name', f => f.location.name = 'Elsewhere', 'invalid'],
  ['wrong coordinates', f => f.location.latitude = 44, 'invalid'],
  ['wrong timezone', f => f.location.timezone = 'UTC', 'invalid'],
  ['missing metric', f => delete f.hourly[0].humidity, 'invalid'],
  ['string metric', f => f.hourly[0].temp = '-2', 'invalid'],
  ['bad percentage', f => f.hourly[0].precipProb = 101, 'invalid'],
  ['negative wind', f => f.hourly[0].windSpeed = -1, 'invalid'],
  ['invalid direction', f => f.hourly[0].windDirection = 90, 'invalid'],
  ['empty condition', f => f.hourly[0].condition = '', 'invalid'],
  ['undated hour', f => f.hourly[0].time = '12:00', 'invalid'],
  ['wrong Toronto offset', f => f.hourly[0].time = '2026-10-20T12:00:00-05:00', 'invalid'],
  ['duplicate hour', f => f.hourly[1].time = f.hourly[0].time, 'invalid'],
  ['gap in hours', f => f.hourly.splice(1, 1), 'invalid'],
  ['missing near-term hours', f => f.hourly.splice(0, 2), 'coverage'],
  ['missing requested hours', f => f.hourly.splice(1), 'coverage'],
];
for (const [name, modify, reason] of invalidCases) test(`${name} uses labeled fallback`, async t => {
  const input = feed(); modify(input);
  const data = await request(t, input);
  assert.equal(data.hourlySource, 'open-meteo');
  assert.equal(data.hourlyFetchedAt, null);
  assert.equal(data.hourlyFallbackReason, reason);
  assert.equal(data.hourly[0].temp, 9);
  assert.equal(data.hourly[0].windDirection, 'S');
  assert.equal(data.hourly[0].humidity, 60);
});

for (const failure of ['offline', 'http']) test(`${failure} Blob uses unavailable fallback`, async t => {
  const data = await request(t, feed(), '', undefined, failure);
  assert.equal(data.hourlySource, 'open-meteo');
  assert.equal(data.hourlyFallbackReason, 'unavailable');
});

test('malformed JSON uses invalid fallback', async t => {
  const data = await request(t, feed(), '', undefined, 'json');
  assert.equal(data.hourlySource, 'open-meteo');
  assert.equal(data.hourlyFallbackReason, 'invalid');
});

for (const query of ['postal=Ottawa&lat=45.4215&lon=-75.6972', 'postal=M1E4V4&lat=45.4215&lon=-75.6972']) test(`other location preserves Open-Meteo: ${query}`, async t => {
  const data = await request(t, feed(), query);
  assert.equal(data.hourlySource, 'open-meteo');
  assert.equal(data.hourlyFallbackReason, null);
  assert.equal(data.hourly[0].temp, 9);
});

for (const [name, now, times, fetchedAt] of [
  ['midnight', '2026-10-21T04:25:00Z', ['2026-10-20T23:00:00-04:00', '2026-10-21T00:00:00-04:00', '2026-10-21T01:00:00-04:00'], '2026-10-21T04:10:00Z'],
  ['fall repeated hour', '2026-11-01T06:25:00Z', ['2026-11-01T01:00:00-04:00', '2026-11-01T01:00:00-05:00', '2026-11-01T02:00:00-05:00'], '2026-11-01T06:10:00Z'],
  ['spring skipped hour', '2026-03-08T06:25:00Z', ['2026-03-08T01:00:00-05:00', '2026-03-08T03:00:00-04:00', '2026-03-08T04:00:00-04:00'], '2026-03-08T06:10:00Z'],
]) test(`${name} selects by instant, preserving Toronto offsets`, async t => {
  const input = feed(times); input.fetchedAt = fetchedAt;
  const data = await request(t, input, '', now);
  assert.equal(data.hourlySource, 'the-weather-network');
  assert.equal(data.hourly[0].time, times[name === 'spring skipped hour' ? 0 : 1]);
  assert.equal(data.hourly.length, 2);
});

test('fractional hours are integer-bounded', async t => {
  const data = await request(t, feed(), 'hours=1.7');
  assert.equal(data.hourly.length, 1);
});

test('TWN next-hour start is valid when the requested window is covered', async t => {
  const input = feed(); input.hourly.shift();
  const data = await request(t, input);
  assert.equal(data.hourlySource, 'the-weather-network');
  assert.equal(data.hourly[0].time, '2026-10-20T13:00:00-04:00');
});

test('exactly 90-minute-old feed remains valid', async t => {
  const input = feed(); input.fetchedAt = '2026-10-20T14:55:00Z';
  const data = await request(t, input);
  assert.equal(data.hourlySource, 'the-weather-network');
});


test('Kolkata keeps the current local hour at 16:40 instead of flooring UTC', async t => {
  const data = await request(t, feed(), 'postal=Kolkata&lat=22.5726&lon=88.3639&timezone=Asia%2FKolkata&hours=1', '2026-10-20T11:10:00Z');
  assert.equal(data.hourlySource, 'open-meteo');
  assert.equal(data.hourly[0].time, '2026-10-20T16:00:00+05:30');
});

test('nonsense compass direction invalidates the whole feed', async t => {
  const input = feed(); input.hourly[0].windDirection = 'banana';
  const data = await request(t, input);
  assert.equal(data.hourlySource, 'open-meteo');
  assert.equal(data.hourlyFallbackReason, 'invalid');
});
