import { bEthPrice } from './bEthPrice'
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
})

addEventListener('fetch', event => {
  event.respondWith(
    handleJsonRpcRequests(event.request, { currentPrice: bEthPrice }),
  )
})
