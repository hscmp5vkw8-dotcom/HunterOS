// Test-only gateway. Only two fixed services and synthetic backend settings exist.
// No project secrets, caller-selected paths, production deployment or auth bypass.
Deno.serve(async (req: Request) => {
  const path = new URL(req.url).pathname;
  if (path === '/health') return Response.json({ runtime: Deno.version });
  const servicePath = path === '/product-import' ? '/app/functions/product-import'
    : path === '/probe' ? '/app/tests/edge-probe/worker' : '';
  if (!servicePath) return new Response('Not found', { status: 404 });
  try {
    // @ts-ignore EdgeRuntime is supplied by Supabase, rather than native Deno.
    const worker = await EdgeRuntime.userWorkers.create({
      servicePath,
      memoryLimitMb: 256,
      workerTimeoutMs: 60000,
      cpuTimeSoftLimitMs: 10000,
      cpuTimeHardLimitMs: 20000,
      noModuleCache: false,
      forceCreate: false,
      envVars: [
        ['SUPABASE_URL', 'http://host.docker.internal:9100'],
        ['SUPABASE_ANON_KEY', 'synthetic-public-fixture'],
        ['SUPABASE_SERVICE_ROLE_KEY', 'synthetic-server-fixture'],
      ],
    });
    return await worker.fetch(req);
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
});
