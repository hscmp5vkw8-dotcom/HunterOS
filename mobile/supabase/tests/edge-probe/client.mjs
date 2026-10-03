import assert from 'node:assert/strict';
const base = 'http://127.0.0.1:9000';
const url = 'https://www.mysteryranch.com/pop-up-30-pack';
const checks = [];
async function check(name, run) {
  try { const detail = await run(); checks.push({ name, passed: true, ...(detail ? { detail } : {}) }); }
  catch (error) { checks.push({ name, passed: false, detail: String(error) }); }
}
async function post(body, token = 'verified-fixture') {
  const r = await fetch(base + '/product-import', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(body), signal: AbortSignal.timeout(25000) });
  return { status: r.status, body: await r.json() };
}
const body = { url, category: 'Pack system', action: 'preview' };
await check('production entrypoint OPTIONS and method handling', async () => {
  assert.equal((await fetch(base + '/product-import', { method: 'OPTIONS' })).status, 204);
  assert.equal((await fetch(base + '/product-import')).status, 405);
});
await check('production entrypoint missing, expired and unverified auth', async () => {
  for (const token of ['', 'expired-fixture', 'unverified-fixture']) assert.equal((await post(body, token)).status, 401);
});
await check('production entrypoint rate reservation denies limited synthetic user', async () => {
  assert.equal((await post(body, 'limited-fixture')).status, 429);
});
await check('production entrypoint rejects private and malformed links', async () => {
  for (const privateURL of ['https://127.0.0.1/product', 'https://169.254.169.254/latest/meta-data', 'https://localhost/item', 'not-a-url']) {
    const result = await post({ ...body, url: privateURL }); assert.equal(result.status, 400); assert(result.body.error);
  }
});
await check('user worker DNS/TCP/TLS, TLS rejection, SSRF redirects and timeout', async () => {
  const r = await fetch(base + '/probe', { signal: AbortSignal.timeout(55000) });
  const report = await r.json(); console.log(JSON.stringify({ sourceProbe: report }));
  assert.equal(r.status, 200); assert(report.checks.every(c => c.passed));
});
const targets = [
  { name: 'tester Mystery Ranch link', url, category: 'Pack system' },
  { name: 'retailer snack and redirects', url: 'https://www.fleetfeet.com/products/gu-energy-stroopwafel', category: 'Food & nutrition' },
  { name: 'food pack versus quoted serving facts', url: 'https://shop.equalexchange.coop/collections/chocolate-bars/products/organic-dark-chocolate-almond-sea-salt-55-cacao', category: 'Food & nutrition' },
];
for (const target of targets) await check('production handler live ' + target.name, async () => {
  const initial = await post({ ...target, action: 'preview' });
  assert.equal(initial.status, 200, JSON.stringify(initial.body));
  const choices = initial.body.product.imported.variants;
  const selected = choices.length ? await post({ ...target, action: 'preview', variantKey: choices[0].key }) : initial;
  assert.equal(selected.status, 200, JSON.stringify(selected.body));
  const product = selected.body.product;
  assert(product.name && product.sourceURL.startsWith('https://'));
  if (choices.length) assert(product.imported.selectedVariant && product.imported.sku);
  if (product.imported.currency !== 'USD') assert.equal(product.priceUSD, null);
  if (target.name.includes('serving')) { assert(product.imported.facts.servingSize); assert(product.imported.facts.ingredients); assert.equal(product.weightGrams, null); }
  console.log(JSON.stringify({ source: target.url, name: product.name, sku: product.imported.sku, price: product.imported.price, currency: product.imported.currency, weight: product.imported.weightValue, unit: product.imported.weightUnit, variants: choices.length, sourceURL: product.sourceURL, facts: product.imported.facts, missing: product.imported.missing }));
  if (target.url === url) {
    if (choices.length) assert.equal((await post({ ...target, action: 'publish' })).status, 400);
    const published = await post({ ...target, action: 'publish', variantKey: product.imported.selectedVariant, note: 'PRIVATE-CLIENT-SENTINEL', name: 'PRIVATE-CLIENT-SENTINEL', weightGrams: 1 });
    assert.equal(published.status, 200, JSON.stringify(published.body));
    assert.equal(published.body.product.name, product.name); assert.deepEqual(published.body.product.imported.variants, []);
  }
});
await check('only synthetic auth/RPC state was changed; private fields excluded', async () => {
  const state = await (await fetch('http://' + process.env.HUNTEROS_FIXTURE_HOST + ':9100/state')).json();
  assert.deepEqual(state.violations, []); assert.equal(state.published.length, 1); assert(state.reserved > 0);
});
console.log(JSON.stringify({ commit: process.env.HUNTEROS_TEST_COMMIT || 'local', checks }));
if (checks.some(c => !c.passed)) process.exitCode = 1;
