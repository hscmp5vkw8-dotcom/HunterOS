import { fetchManufacturer, publicAddress } from '../../../functions/product-import/source.ts';
import { pinnedPageRequest } from '../../../functions/product-import/network.ts';

function assert(value: unknown, message: string): asserts value {
  if (!value) throw Error(message);
}
async function addresses(hostname: string): Promise<string[]> {
  const values = await Promise.allSettled([
    Deno.resolveDns(hostname, 'A'), Deno.resolveDns(hostname, 'AAAA'),
  ]);
  const result = values.flatMap(v => v.status === 'fulfilled' ? v.value : []);
  assert(result.length && result.every(publicAddress), 'Expected public DNS answers: ' + hostname);
  return result;
}
Deno.serve(async () => {
  const checks: { name: string; passed: boolean; detail?: string }[] = [];
  async function check(name: string, run: () => Promise<string | void>) {
    try { const detail = await run(); checks.push({ name, passed: true, ...(detail ? { detail } : {}) }); }
    catch (error) { checks.push({ name, passed: false, detail: String(error) }); }
  }
  await check('user-worker public DNS and pinned TCP/TLS with hostname verification', async () => {
    const target = new URL('https://example.com/');
    const ips = await addresses(target.hostname);
    const response = await pinnedPageRequest(target, ips, AbortSignal.timeout(12000));
    assert(response.ok && (await response.text()).includes('Example Domain'), 'Public pinned TLS response missing');
    return 'Deno.resolveDns, Deno.connect, Deno.startTls and socket reads/writes executed in a user worker';
  });
  await check('TLS rejects a public certificate with the wrong hostname', async () => {
    const target = new URL('https://wrong.host.badssl.com/');
    const ips = await addresses(target.hostname);
    let error = '';
    try { await pinnedPageRequest(target, ips, AbortSignal.timeout(12000)); }
    catch (caught) { error = String(caught); }
    assert(/certificate|cert|tls|hostname/i.test(error), 'Expected a certificate validation failure, got: ' + error);
  });
  await check('mixed public/private DNS prevents a request', async () => {
    let calls = 0, error = '';
    try {
      await fetchManufacturer('https://www.mysteryranch.com/pop-up-30-pack',
        () => { calls++; return Promise.reject(Error('Must not fetch')); },
        () => Promise.resolve(['93.184.216.34', '127.0.0.1']));
    } catch (caught) { error = String(caught); }
    assert(calls === 0 && /public website/.test(error), 'Mixed DNS was not rejected');
  });
  await check('redirect receives fresh DNS validation', async () => {
    let calls = 0, resolves = 0, error = '';
    try {
      await fetchManufacturer('https://www.mysteryranch.com/pop-up-30-pack',
        () => { calls++; return Promise.resolve(new Response(null, { status: 302, headers: { location: '/other-product' } })); },
        () => Promise.resolve(++resolves === 1 ? ['93.184.216.34'] : ['127.0.0.1']));
    } catch (caught) { error = String(caught); }
    assert(calls === 1 && resolves === 2 && /public website/.test(error), 'Redirect DNS validation failed');
  });
  await check('deadline bounds a stalled DNS lookup', async () => {
    const start = Date.now(); let error = '';
    try {
      await fetchManufacturer('https://www.mysteryranch.com/pop-up-30-pack', undefined,
        () => new Promise<string[]>(() => {}));
    } catch (caught) { error = String(caught); }
    assert(/too long/.test(error) && Date.now() - start < 15000, 'Import timeout was not bounded');
  });
  return Response.json({ runtime: Deno.version, checks }, { status: checks.every(c => c.passed) ? 200 : 500 });
});
