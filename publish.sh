#!/bin/bash
set -eu -o pipefail
. .env
ENV="${1:-staging}"
RPCS="\"$PRIMARY_RPC\""
set +u
if [ ! -z $SECONDARY_RPC ]; then
  RPCS="$RPCS,\"$SECONDARY_RPC\""
fi
npm run build
echo "[$RPCS]" | wrangler secret put ETH_RPCS --env $ENV
wrangler publish --env $ENV
