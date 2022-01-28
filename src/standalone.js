/**
 * standalone.js exposes bAtomPriceSafe() function as a standalone function
 * so it can be used as a function anywhere -- aside from cloudflare workers.
 *
 * All variables need to be injected via envvars
 *
 * Must not be used as an entry point.
 */

import { bAtomPriceSafe } from './bAtomPrice'
import { setGlobals } from './globals'

var {
  ENV,
  SENTRY_PROJECT_ID,
  SENTRY_KEY,
  DEVIATION_BLOCK_OFFSETS,
  // BETH_RATE_LIMITS,
  BATOM_PRICE_LIMITS,
  // STETH_RATE_LIMITS,
  ATOM_PRICE_LIMITS,
  ETH_RPCS,
  REQUEST_TIMEOUT,
} = process.env

setGlobals({
  env: ENV,
  sentryProjectId: SENTRY_PROJECT_ID,
  sentryKey: SENTRY_KEY,
  ethRpcs: JSON.parse(ETH_RPCS),
  deviationBlockOffsets:
    DEVIATION_BLOCK_OFFSETS && JSON.parse(DEVIATION_BLOCK_OFFSETS),
  // bEthRateLimits: BETH_RATE_LIMITS && JSON.parse(BETH_RATE_LIMITS),
  bAtomPriceLimits: BATOM_PRICE_LIMITS && JSON.parse(BATOM_PRICE_LIMITS),
  // stEthRateLimits: STETH_RATE_LIMITS && JSON.parse(STETH_RATE_LIMITS),
  atomPriceLimits: ATOM_PRICE_LIMITS && JSON.parse(ATOM_PRICE_LIMITS),
  requestTimeout: REQUEST_TIMEOUT && Number.parseInt(REQUEST_TIMEOUT, 10),
})

export function getBatomPriceSafeStandalone() {
  return bAtomPriceSafe()
}
