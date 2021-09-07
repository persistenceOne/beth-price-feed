import { bEthPriceSafe } from './bEthPrice'
import { handleJsonRpcRequests } from './JsonRpcRequestsHandler'
import { setGlobals } from './globals'

let ethRPCs = []
// Before adding new encrypted env variable to cloudflare
// wrangler compiles and deploys application. At this step
// variable ETH_RPCS doesn't exists yet, so we have to have
// try/catch block here to allow script to be compiled
try {
  ethRPCs = JSON.parse(ETH_RPCS)
} catch (e) {
  console.error(e)
}

setGlobals({
  env: ENV,
  sentryProjectId: SENTRY_PROJECT_ID,
  sentryKey: SENTRY_KEY,
  ethRpcs: ethRPCs,
  deviationBlockOffsets:
    DEVIATION_BLOCK_OFFSETS && JSON.parse(DEVIATION_BLOCK_OFFSETS),
  bEthRateLimits: BETH_RATE_LIMITS && JSON.parse(BETH_RATE_LIMITS),
  bEthPriceLimits: BETH_PRICE_LIMITS && JSON.parse(BETH_PRICE_LIMITS),
  stEthRateLimits: STETH_RATE_LIMITS && JSON.parse(STETH_RATE_LIMITS),
  ethPriceLimits: ETH_PRICE_LIMITS && JSON.parse(ETH_PRICE_LIMITS),
  requestTimeout: REQUEST_TIMEOUT && Number.parseInt(REQUEST_TIMEOUT, 10),
})

addEventListener('fetch', event => {
  event.respondWith(
    handleJsonRpcRequests(event.request, { currentPrice: bEthPriceSafe }),
  )
})
