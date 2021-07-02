import jsonrpc from 'jsonrpc-lite'
import { log } from './sentry'

/**
  Makes eth_call JSON RPC request to ethereum etnode.
  To make method more robust can use multiple JSON RPC nodes.
  Nodes list has to be set via ETH_NODES environment variable.
  If request to one of nodes failed will try to use next node in the list.
  If all requests to nodes failed, will throwAllApiEndpointsFailedError
  @returns result of eth call.
 */
export async function ethCall(params) {
  const response = await apiEndpoints.makeRequest({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(jsonrpc.request(1, 'eth_call', params)),
  })
  const { result, error } = await response.json()
  if (error) {
    throw new EthCallError(params, error)
  }
  return result
}

/**
 * Provides convenient interface to make request to list of nodes.
 * Takes API urls one by one and returns first successfull response.
 * If some of requests fails will report error with information about fail to the Sentry.
 * If all requests fail throws AllApiEndpointsFailedError
 */
const apiEndpoints = {
  _endpoints: [],
  getEndpoints() {
    if (this._endpoints.length > 0) {
      return this._endpoints
    }
    this._endpoints = JSON.parse(ETH_RPCS)
    if (this._endpoints === 0) {
      throw new Error('API endpoints not provided!')
    }
    return this._endpoints
  },
  async makeRequest(payload) {
    const endpoints = this.getEndpoints()
    for (let i = 0; i < endpoints.length; ++i) {
      const response = await fetch(endpoints[i], payload)
      if (response.status === 200) {
        return response
      }
      await log(
        new ApiRequestError(
          endpoints[i],
          response.status,
          await response.text(),
        ),
      )
    }
    throw new AllApiEndpointsFailedError()
  },
}

class ApiRequestError extends Error {
  constructor(url, status, text) {
    super('API request error')
    this.name = 'ApiRequestError'
    this.url = url
    this.status = status
    this.text = text
  }
}

class AllApiEndpointsFailedError extends Error {
  constructor() {
    super('All API endpoint requests failed')
  }
}

class EthCallError extends Error {
  constructor(params, error) {
    super('eth_call finished with error')
    this.params = params
    this.error = error
  }
}
