const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const Home = require('../.test-dist/page.js').default;

for (const source of ['the-weather-network', 'open-meteo']) {
  test(`${source} cards show the forecast without humidity or wind details`, t => {
    const weather = {
      location: { name: 'Scarborough' }, current: { temp: 10, conditionCode: 0 },
      hourlySource: source, hourlyFetchedAt: null, hourlyFallbackReason: null,
      hourly: [{ time: '2026-10-20T12:00:00-04:00', temp: 10, feelsLike: 8,
        condition: 'Clear', conditionCode: 0, precipProb: 20, precip: 0,
        windSpeed: 15, windDirection: 'W', windGust: 25, humidity: 70 }],
    };
    let index = 0;
    const states = [weather, false, ''];
    t.mock.method(React, 'useState', () => [states[index++], () => {}]);
    t.mock.method(React, 'useEffect', () => {});
    const html = renderToStaticMarkup(React.createElement(Home));
    assert.match(html, /10°C/);
    assert.match(html, /Feels like/);
    assert.match(html, /Precip chance/);
    assert.doesNotMatch(html, /Humidity|Wind|Gust|km\/h/);
    assert.equal(html.includes('Precip amount'), source === 'open-meteo');
    assert.match(html, /<time[^>]*>12:00<\/time>/);
    assert.doesNotMatch(html, /UTC|10-20 ·/);
  });
}

for (const [condition, icon] of Object.entries({
  'A mix of sun and clouds': 'partly-cloudy-day',
  Clear: 'clear-night',
  'Mainly clear': 'partly-cloudy-night',
  'Mainly sunny': 'partly-cloudy-day',
  'Partly cloudy': 'partly-cloudy-day',
  Sunny: 'clear-day',
  Unknown: null,
})) {
  test(`scraped condition ${condition} uses its matching image`, t => {
    const weather = {
      location: { name: 'Scarborough' }, current: { temp: 10, conditionCode: 0 },
      hourlySource: 'the-weather-network', hourlyFetchedAt: null, hourlyFallbackReason: null,
      hourly: [{ time: '2026-10-20T00:00:00-04:00', temp: 10, feelsLike: 8,
        condition, conditionCode: null, precipProb: 0, precip: null }],
    };
    let index = 0;
    const states = [weather, false, ''];
    t.mock.method(React, 'useState', () => [states[index++], () => {}]);
    t.mock.method(React, 'useEffect', () => {});
    const html = renderToStaticMarkup(React.createElement(Home));
    assert.match(html, /<time[^>]*>00:00<\/time>/);
    if (icon) {
      assert.ok(html.includes(`src="/weather/${icon}.svg"`));
      assert.ok(require('node:fs').existsSync(`public/weather/${icon}.svg`));
    } else {
      assert.doesNotMatch(html, /<img/);
    }
    assert.ok(html.includes(condition));
  });
}
