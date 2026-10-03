# Isolated Edge Runtime importer verification

Run `bash mobile/supabase/tests/edge-probe/run.sh` from the repository root on an existing Linux Docker host with Node 22+.

The test uses official Supabase Edge Runtime v1.77.4, pinned to the Docker Hub linux/amd64 manifest `sha256:fded42ff725708990b1a0803633c2659453259d075c4bec6b4d01dfb82dc055e`. A test-only main gateway starts the unchanged production importer in a restricted user worker. A local synthetic HTTP auth/RPC fixture replaces all backend data; no Supabase project, secrets, user rows, migrations or deployments are used. The container mounts only function and test sources read-only, drops capabilities, uses a localhost port and is removed on exit. No Docker socket or repository credentials enter the container.

Checks cover actual DNS, pinned TCP/TLS and certificate rejection in a user worker, redirect DNS validation, stalled-DNS timeout, production method/auth/rate contracts, private URL rejection, live screenshot/retailer/food links, explicit variants, quoted food facts, source-only publication and exclusion of private caller edits. Live source-site blocking is reported as a failure with its actual error; the test never bypasses it or substitutes invented product data.

This verifies the official local Edge Runtime, not hosted GoTrue/PostgREST, physical devices, store submission or tester availability. Database authorization already has separate isolated migration tests. The job has read-only repository permissions, no secrets and no deployment step.
