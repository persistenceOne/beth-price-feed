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
  let rpcRequest = { id: null }
  try {
    rpcRequest = await parseJsonRpcPayload(request)
    const rpcResponse = await handleRpcRequest(handlers, rpcRequest)
    return new JsonResponse(rpcResponse)
  } catch (error) {
    // error contains data for JsonRpcError
    if (error instanceof jsonrpc.JsonRpcError) {
      return new JsonResponse(jsonrpc.error(rpcRequest.id, error))
    }
    const jsonRpcError = error.code
      ? new jsonrpc.JsonRpcError(error.message, error.code, error.data)
      : jsonrpc.JsonRpcError.internalError()

    const errorType = error.name || (error.constructor || {}).name
    console.error(`${errorType}: ${error.message || '<no message>'}`)
    await log(error, request)
    return new JsonResponse(jsonrpc.error(rpcRequest.id, jsonRpcError))
  }
}

async function parseJsonRpcPayload(request) {
  let payloadText
  try {
    payloadText = await request.text()
    JSON.parse(payloadText)
  } catch {
    throw jsonrpc.JsonRpcError.parseError()
  }
  const { payload, type } = jsonrpc.parse(payloadText)
  switch (type) {
    case 'request':
      return payload
    case 'invalid':
      throw jsonrpc.JsonRpcError.invalidRequest()
    default:
      throw jsonrpc.JsonRpcError.methodNotFound()
  }
}

async function handleRpcRequest(handlers, rpcRequest) {
  const handler = handlers[rpcRequest.method]
  if (!handler) {
    throw jsonrpc.JsonRpcError.methodNotFound()
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
