import jsonrpc from 'jsonrpc-lite'
import { log } from './sentry'

/**
 * Handles JSON RPC requests
 * @param {*} request - Wrangler's Request instance
 * @param {*} handlers - Method handlers by method name
 */
export async function handleJsonRpcRequests(request, handlers) {
  if (request.method !== 'POST') {
    return new NotFoundResponse()
  }

  try {
    const rpcRequest = await parseJsonRpcPayload(request)
    const rpcResponse = await handleRpcRequest(handlers, rpcRequest)
    return new JsonResponse(rpcResponse)
  } catch (error) {
    if (error.data) {
      return new JsonResponse(error.data)
    }
    const errorType = error.name || (error.constructor || {}).name
    console.error(`${errorType}: ${error.message || '<no message>'}`)
    await log(error, request)
    return new JsonResponse(
      jsonrpc.error(null, new jsonrpc.JsonRpcError('Internal error', -32603)),
    )
  }
}

async function parseJsonRpcPayload(request) {
  let payloadText
  try {
    payloadText = await request.text()
    JSON.parse(payloadText)
  } catch {
    throw new JsonRpcParseError()
  }
  const { payload, type } = jsonrpc.parse(payloadText)
  switch (type) {
    case 'invalid':
      throw new JsonRpcInvalidRequestError()
    case 'request':
      return payload
    default:
      throw new JsonRpcMethodNotFoundError()
  }
}

async function handleRpcRequest(handlers, rpcRequest) {
  const handler = handlers[rpcRequest.method]
  if (!handler) {
    throw new JsonRpcMethodNotFoundError()
  }
  const result = await handler()
  return jsonrpc.success(rpcRequest.id, result)
}

class NotFoundResponse extends Response {
  constructor() {
    super('404 page not found', { status: 404 })
  }
}

class JsonResponse extends Response {
  constructor(payload) {
    super(JSON.stringify(payload), {
      headers: { 'content-type': 'application/json' },
    })
  }
}

class JsonRpcError extends Error {
  constructor(data) {
    super('Error on JSON RPC request')
    this.data = data
    this.name = 'RpcError'
  }
}

class JsonRpcParseError extends JsonRpcError {
  constructor() {
    super(jsonrpc.error(null, new jsonrpc.JsonRpcError('Parse error', -32700)))
  }
}

class JsonRpcInvalidRequestError extends JsonRpcError {
  constructor() {
    super(
      jsonrpc.error(null, new jsonrpc.JsonRpcError('Invalid Request', -32600)),
    )
  }
}

class JsonRpcMethodNotFoundError extends JsonRpcError {
  constructor() {
    super(
      jsonrpc.error(null, new jsonrpc.JsonRpcError('Method not found', -32601)),
    )
  }
}
