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
  });
}
