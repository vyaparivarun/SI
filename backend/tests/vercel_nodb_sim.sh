#!/bin/bash
# Vercel no-DB / unreachable-DB simulation: runs backend copy (no .env) on spare port with Vercel deps venv.
# Usage: bash vercel_nodb_sim.sh nodb|unreachable
MODE=$1; PORT=8099; B=http://127.0.0.1:$PORT
rm -rf /tmp/vsim_app && mkdir /tmp/vsim_app && cp /app/backend/*.py /app/backend/pyproject.toml /tmp/vsim_app/
cd /tmp/vsim_app
if [ "$MODE" = "unreachable" ]; then
  env MONGO_URL=mongodb://10.255.255.1:27017 DB_NAME=x /root/vsim/.venv/bin/uvicorn server:app --port $PORT > /tmp/vsim_$MODE.log 2>&1 < /dev/null &
else
  env -u MONGO_URL -u DB_NAME /root/vsim/.venv/bin/uvicorn server:app --port $PORT > /tmp/vsim_$MODE.log 2>&1 < /dev/null &
fi
PID=$!
sleep 4
req() { echo "== $1 $2"; curl -s -m 30 -w "\n   -> HTTP %{http_code} in %{time_total}s\n" "${@:3}" "$B$2" | cut -c1-300; }
req GET /api/
req GET "/api/solar/resource?pincode=110032"
req GET "/api/solar/resource?pincode=560001"
req POST /api/leads -X POST -H 'Content-Type: application/json' -d '{"name":"TEST_sim","mobile":"9999999999","city":"Delhi"}'
req GET /api/stats
req GET /api/stats
req GET /api/leads
req POST /api/epc/register -X POST -H 'Content-Type: application/json' -d '{"companyName":"TEST_sim","mobile":"9999999999"}'
req GET "/api/solar/resource?pincode=12345"
kill $PID; wait $PID 2>/dev/null
echo "== log errors"; grep -iE "error|traceback|warning" /tmp/vsim_$MODE.log | cut -c1-250 | head -20
