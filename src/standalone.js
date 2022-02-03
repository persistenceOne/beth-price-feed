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
  BATOM_PRICE_LIMITS,
  ATOM_PRICE_LIMITS,
  ETH_RPCS,
  REQUEST_TIMEOUT,
} = process.env

setGlobals({
  env: ENV,
  sentryProjectId: SENTRY_PROJECT_ID,
  sentryKey: SENTRY_KEY,
  ethRpcs: ETH_RPCS,
  deviationBlockOffsets: DEVIATION_BLOCK_OFFSETS && DEVIATION_BLOCK_OFFSETS,
  bAtomPriceLimits: BATOM_PRICE_LIMITS && BATOM_PRICE_LIMITS,
  atomPriceLimits: ATOM_PRICE_LIMITS && ATOM_PRICE_LIMITS,
  requestTimeout: REQUEST_TIMEOUT && Number.parseInt(REQUEST_TIMEOUT, 10),
})

export const getBatomPriceSafeStandalone = () => {
  console.log();
  return bAtomPriceSafe()
}
