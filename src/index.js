import { bEthPrice } from './bEthPrice'
import { handleJsonRpcRequests } from './JsonRpcRequestsHandler'
import { setGlobals } from './globals'

setGlobals({
  env: ENV,
  sentryProjectId: SENTRY_PROJECT_ID,
  sentryKey: SENTRY_KEY,
  ethRpcs: JSON.parse(ETH_RPCS),
})

addEventListener('fetch', event => {
  event.respondWith(
    handleJsonRpcRequests(event.request, { currentPrice: bEthPrice }),
  )
})
