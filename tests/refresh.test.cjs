const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const Home = require('../.test-dist/page.js').default;

const flush = async () => { for (let i = 0; i < 15; i++) await Promise.resolve(); };
const initial = { hourlySource: 'the-weather-network', hourlyFetchedAt: '2026-10-20T14:30:30Z', hourly: [] };
const fallback = { hourlySource: 'open-meteo', hourlyFetchedAt: null, hourlyFallbackReason: 'stale', hourly: [] };

function mount(t, fetcher) {
  t.mock.timers.enable({ apis: ['Date', 'setInterval', 'setTimeout'], now: Date.parse('2026-10-20T16:00:00Z') });
  const document = new EventTarget();
  document.visibilityState = 'visible';
  const previousDocument = Object.getOwnPropertyDescriptor(global, 'document');
  Object.defineProperty(global, 'document', { configurable: true, value: document });
  const values = [];
  const history = [];
  let effect;
  let count = 0;
  t.mock.method(React, 'useState', initial => {
    const index = count++;
    values[index] = initial;
    return [initial, next => { values[index] = typeof next === 'function' ? next(values[index]) : next; history.push([...values]); }];
  });
  t.mock.method(React, 'useEffect', callback => { effect = callback; });
  t.mock.method(global, 'fetch', fetcher);
  Home();
  const cleanup = effect();
  t.after(() => {
    cleanup();
    t.mock.timers.reset();
    if (previousDocument) Object.defineProperty(global, 'document', previousDocument);
    else delete global.document;
  });
  return { values, history, document, cleanup };
}

test('open dashboard refreshes and replaces expired TWN data without reloading', async t => {
  let calls = 0;
  const app = mount(t, async () => Response.json(++calls === 1 ? initial : fallback));
  await flush();
  assert.equal(app.values[0].hourlySource, 'the-weather-network');
  t.mock.timers.tick(60000);
  await flush();
  assert.equal(app.values[0].hourlySource, 'open-meteo');
  assert.equal(app.values[0].hourlyFallbackReason, 'stale');
});

test('tab resume refetches, hidden state does not, and cleanup removes timer/listener', async t => {
  let calls = 0;
  const app = mount(t, async () => { calls++; return Response.json(initial); });
  await flush();
  app.document.visibilityState = 'hidden';
  app.document.dispatchEvent(new Event('visibilitychange'));
  await flush();
  assert.equal(calls, 1);
  app.document.visibilityState = 'visible';
  app.document.dispatchEvent(new Event('visibilitychange'));
  await flush();
  assert.equal(calls, 2);
  app.cleanup();
  app.document.dispatchEvent(new Event('visibilitychange'));
  t.mock.timers.tick(60000);
  await flush();
  assert.equal(calls, 2);
});

test('slow requests never overlap and cleanup aborts them without updating unmounted state', async t => {
  let calls = 0;
  let signal;
  let finish;
  const app = mount(t, (_url, options) => {
    calls++; signal = options?.signal;
    return new Promise(resolve => { finish = resolve; });
  });
  app.document.dispatchEvent(new Event('visibilitychange'));
  t.mock.timers.tick(60000);
  await flush();
  assert.equal(calls, 1);
  app.cleanup();
  assert.ok(signal?.aborted, 'unmount must abort in-flight fetch');
  const updates = app.history.length;
  finish(Response.json(initial));
  await flush();
  assert.equal(app.history.length, updates);
  t.mock.timers.tick(120000);
  await flush();
  assert.equal(calls, 1);
});

test('timed-out refresh clears old data and the next interval can retry', async t => {
  let calls = 0;
  const app = mount(t, (_url, options) => {
    calls++;
    if (calls !== 2) return Promise.resolve(Response.json(calls === 1 ? initial : fallback));
    return new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('aborted'))));
  });
  await flush();
  app.document.dispatchEvent(new Event('visibilitychange'));
  t.mock.timers.tick(15000);
  await flush();
  assert.equal(app.values[0], null);
  assert.match(app.values[2], /timed out/);
  t.mock.timers.tick(45000);
  await flush();
  assert.equal(app.values[0].hourlySource, 'open-meteo');
});
