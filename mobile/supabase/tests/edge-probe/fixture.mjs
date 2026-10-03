// Synthetic HTTP auth/RPC contract fixture, confined to the Docker bridge gateway.
import http from 'node:http';
import assert from 'node:assert/strict';
const host = process.env.HUNTEROS_FIXTURE_HOST;
assert(host && /^(?:127\.|172\.|10\.|192\.168\.)/.test(host), 'Expected a local Docker gateway');
const state = { reserved: 0, published: [], violations: [] };
const server = http.createServer(async (req, res) => {
  const json = (value, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)); };
  try {
    if (req.url === '/health') return json({ ready: true });
    if (req.url === '/state') return json(state);
    if (req.url === '/auth/v1/user') {
      assert.equal(req.headers.apikey, 'synthetic-public-fixture');
      const token = req.headers.authorization;
      if (!['Bearer verified-fixture', 'Bearer unverified-fixture', 'Bearer limited-fixture'].includes(token)) return json({ error: 'Expired fixture' }, 401);
      return json({ id: token === 'Bearer limited-fixture' ? 'limited-user' : 'verified-user', email_confirmed_at: token === 'Bearer unverified-fixture' ? null : '2026-01-01' });
    }
    assert.equal(req.method, 'POST');
    assert.equal(req.headers.apikey, 'synthetic-server-fixture');
    assert.equal(req.headers.authorization, 'Bearer synthetic-server-fixture');
    let text = ''; for await (const chunk of req) { text += chunk; assert(text.length < 40000); }
    const body = JSON.parse(text);
    if (req.url === '/rest/v1/rpc/reserve_product_import') { state.reserved++; return json(body.p_user !== 'limited-user'); }
    if (req.url === '/rest/v1/rpc/publish_manufacturer_product') {
      assert.equal(body.p_user, 'verified-user');
      assert(!JSON.stringify(body).includes('PRIVATE-CLIENT-SENTINEL'));
      assert(JSON.stringify(body.p_product).length < 20000);
      state.published.push(body);
      return json({ ...body.p_product, id: 'synthetic-shared-product' });
    }
    return json({ error: 'Unexpected fixture route' }, 404);
  } catch (error) { state.violations.push(String(error)); return json({ error: String(error) }, 500); }
});
server.listen(9100, host, () => console.log('Synthetic auth/RPC fixture ready'));
