import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { parseCountryHistory, countrySnapshot } from '../src/data/country-history.ts';
function contains(geometry, [x, y]) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  return polygons.some((polygon) => {
    let inside = false;
    for (const ring of polygon) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  });
}

const read = (name) => JSON.parse(readFileSync(new URL(`../public/data/world/history/${name}`, import.meta.url)));
const bundle = () => parseCountryHistory(read('countries.json'));
const names = (snapshot) => snapshot.countries.features.map((f) => f.properties.name);
const get = (snapshot, id) => snapshot.countries.features.find((f) => f.properties.countryId === id);

// Catches leaking present-day statehood or names into historical snapshots.
test('year-end snapshots represent Timor and the Serbia–Montenegro transition', () => {
  const history = bundle();
  for (const year of [2000, 2001]) {
    const snapshot = countrySnapshot(history, year);
    assert.equal(get(snapshot, 'TLS').properties.status, 'UN administration');
    assert.ok(names(snapshot).includes('Federal Republic of Yugoslavia'));
    assert.equal(get(snapshot, 'MNE'), undefined);
  }
  for (const year of [2002, 2003, 2004, 2005, 2006]) {
    assert.equal(get(countrySnapshot(history, year), 'TLS').properties.status, 'Independent state');
  }
  for (const year of [2003, 2004, 2005]) {
    const snapshot = countrySnapshot(history, year);
    assert.ok(names(snapshot).includes('Serbia and Montenegro'));
    assert.equal(get(snapshot, 'SRB'), undefined);
  }
  const last = countrySnapshot(history, 2006);
  assert.ok(get(last, 'SRB'));
  assert.ok(get(last, 'MNE'));
  assert.equal(get(last, 'YUG'), undefined);
});

// Catches reusing today's state splits or territory ownership.
test('early maps retain unified Sudan, pre-2008 Serbia and pre-2014 Ukraine', () => {
  const history = bundle();
  for (const year of [2000, 2006]) {
    const snapshot = countrySnapshot(history, year);
    assert.equal(get(snapshot, 'SDS'), undefined);
    assert.equal(get(snapshot, 'KOS'), undefined);
    assert.ok(contains(get(snapshot, 'SDN').geometry, [31.6, 4.85])); // Juba
    assert.ok(contains(get(snapshot, 'UKR').geometry, [34.1, 44.95])); // Simferopol
    const serbia = get(snapshot, year < 2006 ? 'YUG' : 'SRB');
    assert.ok(contains(serbia.geometry, [21.16, 42.66])); // Pristina
    assert.ok(names(snapshot).includes('Swaziland'));
    assert.ok(names(snapshot).includes('Macedonia'));
    assert.ok(get(snapshot, 'AND')); // small-state reference retained
  }
});

// Catches orphan labels, invalid anchors, and nondeterministic priorities.
test('each year has stable unique country records and interior ranked labels', () => {
  const history = bundle();
  for (let year = 2000; year <= 2006; year++) {
    const snapshot = countrySnapshot(history, year);
    assert.ok(snapshot.countries.features.length > 200);
    const countries = new Map(snapshot.countries.features.map((f) => [f.id, f]));
    assert.equal(countries.size, snapshot.countries.features.length);
    assert.equal(snapshot.labels.features.length, countries.size);
    for (const label of snapshot.labels.features) {
      assert.ok(contains(countries.get(label.id).geometry, label.geometry.coordinates), label.properties.name);
      assert.ok(Number.isFinite(label.properties.priority));
      assert.ok(label.properties.labelRank >= 1 && label.properties.labelRank <= 7);
    }
  }
});

// Catches silently serving a nearby year or accepting a corrupt cached bundle.
test('unsupported years and incomplete historical bundles fail explicitly', () => {
  const history = bundle();
  for (const year of [1999, 2007, 2026, 2000.5, NaN]) assert.throws(() => countrySnapshot(history, year));
  const invalid = read('countries.json');
  invalid.snapshots['2000'] = ['missing-country'];
  assert.throws(() => parseCountryHistory(invalid));
  const missing = read('countries.json');
  delete missing.snapshots['2004'];
  assert.throws(() => parseCountryHistory(missing));
  const corrupt = read('countries.json');
  corrupt.labels.features[0].geometry.coordinates = [NaN, 45];
  assert.throws(() => parseCountryHistory(corrupt));
  const brokenRing = read('countries.json');
  brokenRing.countries.features[0].geometry.coordinates = [];
  assert.throws(() => parseCountryHistory(brokenRing));
});

// Catches presenting research-only settlements as implemented polygon changes.
test('provenance and chronology distinguish source geometry from unimplemented settlements', () => {
  const metadata = read('metadata.json');
  assert.equal(metadata.license, 'CC BY-NC-SA 4.0');
  assert.equal(metadata.snapshotDate, '31 December');
  assert.equal(metadata.outputSha256, createHash('sha256').update(readFileSync(new URL('../public/data/world/history/countries.json', import.meta.url))).digest('hex'));
  assert.ok(metadata.sourceSha256.match(/^[a-f0-9]{64}$/));
  const events = read('changes.json');
  assert.equal(events.find((e) => e.id === 'timor-independence').date, '2002-05-20');
  assert.equal(events.find((e) => e.id === 'montenegro-independence').date, '2006-06-03');
  assert.equal(events.find((e) => e.id === 'bakassi-agreement').geometry, 'not-encoded');
  assert.equal(events.find((e) => e.id === 'poland-slovakia').geometry, 'not-encoded');
  for (const event of events) assert.ok(event.sources.every((s) => s.url.startsWith('https://')));
});
