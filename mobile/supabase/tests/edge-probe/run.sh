#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../../.."
export HUNTEROS_TEST_COMMIT="$(git rev-parse HEAD)"
printf 'Testing source commit %s\n' "$HUNTEROS_TEST_COMMIT"
# Official release v1.77.4, linux/amd64 manifest verified from Docker Hub.
image='supabase/edge-runtime@sha256:fded42ff725708990b1a0803633c2659453259d075c4bec6b4d01dfb82dc055e'
container='hunteros-isolated-edge-probe'
fixture_pid=''
cleanup() {
  docker logs "$container" 2>/dev/null || true
  docker rm -f "$container" >/dev/null 2>&1 || true
  if [[ -n "$fixture_pid" ]]; then kill "$fixture_pid" 2>/dev/null || true; fi
}
trap cleanup EXIT
docker pull "$image"
docker image inspect "$image" --format '{{json .RepoDigests}}'
docker run --rm "$image" --version
docker run --rm "$image" start --help
export HUNTEROS_FIXTURE_HOST
HUNTEROS_FIXTURE_HOST="$(docker network inspect bridge --format '{{(index .IPAM.Config 0).Gateway}}')"
node supabase/tests/edge-probe/fixture.mjs &
fixture_pid=$!
docker run -d --name "$container" --cap-drop ALL --security-opt no-new-privileges \
  --memory 512m --cpus 2 --pids-limit 256 \
  --add-host host.docker.internal:host-gateway -p 127.0.0.1:9000:9000 \
  -v "$PWD/supabase/functions:/app/functions:ro" \
  -v "$PWD/supabase/tests/edge-probe:/app/tests/edge-probe:ro" \
  "$image" start --main-service /app/tests/edge-probe/main --port 9000
node --input-type=module -e '
for(let i=0;i<30;i++){try{const r=await fetch("http://127.0.0.1:9000/health");if(r.ok){console.log(await r.text());process.exit(0);}}catch{}await new Promise(r=>setTimeout(r,1000));}throw Error("Edge Runtime did not become ready");'
node supabase/tests/edge-probe/client.mjs
