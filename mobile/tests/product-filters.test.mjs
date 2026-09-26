import test from 'node:test';
import assert from 'node:assert/strict';
import {
  catalogActivity, catalogVehicle, emptyCatalogRanges, filterCatalog, parseCatalogRanges,
} from '../src/product-filters.ts';

const photo = { url: 'https://example.com/product.jpg', sourceURL: 'https://example.com/product', caption: '', checkedAt: '', rights: 'reference-preview' };
const product = (id, patch = {}) => ({
  id, name: id, brand: 'Alpine', model: 'Trail', variant: 'Standard', category: 'Other', kind: 'Gear',
  weightGrams: null, weightLabel: '', weightCheckedAt: '', priceUSD: null, priceCheckedAt: '',
  sourceURL: 'https://example.com/product', purchaseURL: '', checkedAt: '', note: '', tags: [],
  carry: 'packed', photo: null, reviewStatus: 'legacy-reference', ...patch,
});
const ids = values => values.map(value => value.id);

test('multiword search combines brand, model, variant, kind, category, tags, and name', () => {
  const item = product('one', { name: 'Élite', brand: 'NEMO', model: 'Hornet', variant: '2-person', kind: 'Tent', category: 'Shelter & sleep', tags: ['backpacking'] });
  for (const query of ['elite nemo', 'hornet 2-person', 'tent sleep backpacking', 'NÉMO 2 PERSON ELITE']) {
    assert.deepEqual(ids(filterCatalog([item], { query })), ['one'], query);
  }
  assert.deepEqual(filterCatalog([item], { query: 'nemo missing' }), []);
  assert.deepEqual(ids(filterCatalog([item], { query: '   ' })), ['one']);
});

test('search normalizes punctuation, accents, and multiplication marks', () => {
  const item = product('recovery', { brand: 'Müller', model: '4×4', tags: ['off-road'] });
  assert.deepEqual(ids(filterCatalog([item], { query: 'muller 4x4 off road' })), ['recovery']);
});

test('all facets and binary filters compose without replacing each other', () => {
  const selected = product('selected', { brand: 'WARN', kind: 'Winch', category: 'Recovery & towing', tags: ['off-road', 'atv'], photo, weightGrams: 4500, priceUSD: 350 });
  const items = [selected, ...[
    { id: 'no-photo', photo: null }, { id: 'no-weight', weightGrams: null }, { id: 'no-price', priceUSD: null },
    { id: 'wrong-brand', brand: 'Other' }, { id: 'wrong-kind', kind: 'Helmet' }, { id: 'wrong-category', category: 'Other' },
    { id: 'wrong-activity', tags: ['hiking', 'atv'] }, { id: 'wrong-vehicle', tags: ['off-road', 'utv'] }, { id: 'not-favorite' },
  ].map(patch => ({ ...selected, ...patch }))];
  assert.deepEqual(ids(filterCatalog(items, {
    brand: 'WARN', kind: 'Winch', category: 'Recovery & towing', activity: 'off-road', vehicle: 'atv',
    photosOnly: true, knownWeight: true, knownPrice: true,
    favorites: items.filter(item => item.id !== 'not-favorite').map(item => item.id),
    minPriceUSD: 350, maxPriceUSD: 350, minWeightGrams: 4500, maxWeightGrams: 4500,
  })), ['selected']);
});

test('an empty favorites list matches nothing while a missing list leaves all products', () => {
  const items = [product('one'), product('two')];
  assert.equal(filterCatalog(items, { favorites: [] }).length, 0);
  assert.equal(filterCatalog(items, { favorites: null }).length, 2);
  assert.equal(filterCatalog(items, {}).length, 2);
});

test('activity and vehicle filters use normalized tags, not incidental product-name text', () => {
  const items = [
    product('name-only', { name: 'Camping ATV' }),
    product('matching', { tags: ['CAMPING', 'all-terrain vehicle'] }),
    product('other-activity', { tags: ['hiking', 'atv'] }),
  ];
  assert.deepEqual(ids(filterCatalog(items, { activity: 'camping', vehicle: 'atv' })), ['matching']);
  for (const activity of ['hiking', 'backpacking', 'hunting', 'camping', 'off-road']) {
    assert.equal(filterCatalog([product(activity, { tags: [activity] })], { activity }).length, 1);
  }
});

test('route and tag aliases cover hiking and off-road vehicle profiles', () => {
  assert.equal(catalogActivity('Four-wheeling'), 'off-road');
  assert.equal(catalogActivity('off-road'), 'off-road');
  assert.equal(catalogActivity('Hiking'), 'hiking');
  assert.equal(catalogActivity('unknown'), undefined);
  assert.equal(catalogVehicle('4×4'), '4x4');
  assert.equal(catalogVehicle('side-by-side'), 'utv');
  assert.equal(catalogVehicle('ATV'), 'atv');
  assert.equal(catalogVehicle(), undefined);
  assert.deepEqual(ids(filterCatalog([product('utv', { tags: ['offroad', 'side-by-side'] })], { activity: 'off-road', vehicle: 'utv' })), ['utv']);
});

test('numeric bounds are inclusive and zero never means unknown', () => {
  const items = [product('unknown'), product('zero', { priceUSD: 0, weightGrams: 0 }), product('ten', { priceUSD: 10, weightGrams: 10 }), product('eleven', { priceUSD: 11, weightGrams: 11 })];
  assert.deepEqual(ids(filterCatalog(items, { minPriceUSD: 0, maxPriceUSD: 10, minWeightGrams: 0, maxWeightGrams: 10, sort: 'price-asc' })), ['zero', 'ten']);
  assert.deepEqual(ids(filterCatalog(items, { maxPriceUSD: 0 })), ['zero']);
  assert.deepEqual(ids(filterCatalog(items, { maxWeightGrams: 0 })), ['zero']);
  assert.equal(filterCatalog(items, { knownWeight: true, knownPrice: true }).length, 3);
});

test('one-sided ranges exclude unknowns instead of treating them as zero', () => {
  const items = [product('unknown'), product('known', { priceUSD: 5, weightGrams: 7 })];
  for (const filter of [{ minPriceUSD: 0 }, { maxPriceUSD: 10 }, { minWeightGrams: 0 }, { maxWeightGrams: 10 }]) {
    assert.deepEqual(ids(filterCatalog(items, filter)), ['known']);
  }
});

test('ascending and descending numeric sorts leave unknowns last with deterministic ties', () => {
  const items = [product('unknown-z', { name: 'Zebra' }), product('high', { name: 'B', priceUSD: 50, weightGrams: 50 }), product('unknown-a', { name: 'Apple' }), product('low', { name: 'C', priceUSD: 0, weightGrams: 0 }), product('high-a', { name: 'A', priceUSD: 50, weightGrams: 50 })];
  for (const sort of ['price-asc', 'weight-asc']) assert.deepEqual(ids(filterCatalog(items, { sort })), ['low', 'high-a', 'high', 'unknown-a', 'unknown-z']);
  for (const sort of ['price-desc', 'weight-desc']) assert.deepEqual(ids(filterCatalog(items, { sort })), ['high-a', 'high', 'low', 'unknown-a', 'unknown-z']);
});

test('featured prioritizes photos, name sort supports both directions, and input stays unchanged', () => {
  const items = Object.freeze([product('a', { name: 'Alpha' }), product('z', { name: 'Zulu', photo }), product('b', { name: 'Beta', photo })]);
  assert.deepEqual(ids(filterCatalog(items)), ['b', 'z', 'a']);
  assert.deepEqual(ids(filterCatalog(items, { sort: 'name-asc' })), ['a', 'b', 'z']);
  assert.deepEqual(ids(filterCatalog(items, { sort: 'name-desc' })), ['z', 'b', 'a']);
  assert.deepEqual(ids(items), ['a', 'z', 'b']);
});

test('range parsing preserves blank, zero, decimals, and whitespace', () => {
  assert.deepEqual(parseCatalogRanges(emptyCatalogRanges()), { valid: true, values: {}, errors: {} });
  const result = parseCatalogRanges({ minPriceUSD: ' 0 ', maxPriceUSD: '100.50', minWeightGrams: '.5', maxWeightGrams: '200.' });
  assert.equal(result.valid, true);
  assert.deepEqual(result.values, { minPriceUSD: 0, maxPriceUSD: 100.5, minWeightGrams: 0.5, maxWeightGrams: 200 });
});

test('range parsing explicitly rejects malformed numbers rather than coercing them', () => {
  for (const value of ['-1', 'NaN', 'Infinity', '12abc', '$50', '1,000', '0x20', '1e3', '.']) {
    const result = parseCatalogRanges({ ...emptyCatalogRanges(), maxPriceUSD: value });
    assert.equal(result.valid, false, value);
    assert.ok(result.errors.maxPriceUSD, value);
    assert.equal(result.values.maxPriceUSD, undefined);
  }
});

test('reversed price and weight ranges report the affected maximum', () => {
  const result = parseCatalogRanges({ minPriceUSD: '60', maxPriceUSD: '50', minWeightGrams: '200', maxWeightGrams: '100' });
  assert.equal(result.valid, false);
  assert.match(result.errors.maxPriceUSD, /Maximum price/);
  assert.match(result.errors.maxWeightGrams, /Maximum weight/);
});

test('programmatic invalid bounds fail clearly rather than silently changing results', () => {
  for (const filters of [{ minPriceUSD: NaN }, { maxWeightGrams: Infinity }, { minWeightGrams: -1 }, { minPriceUSD: 10, maxPriceUSD: 5 }, { minWeightGrams: 10, maxWeightGrams: 5 }]) {
    assert.throws(() => filterCatalog([product('one')], filters), RangeError);
  }
});
