import { bEthPrice } from './bEthPrice'
import { handleJsonRpcRequests } from './JsonRpcRequestsHandler'

addEventListener('fetch', event => {
  event.respondWith(
    handleJsonRpcRequests(event.request, { currentPrice: bEthPrice }),
  )
})
