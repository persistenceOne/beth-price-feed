import { BAtomSafePriceValidator } from './BAtomSafePriceValidator'

export const globals = {
  env: 'development',
  sentryProjectId: '',
  sentryKey: '',
  ethRpcs: [],
  deviationBlockOffsets: [],
  bAtomSafePriceValidator: new BAtomSafePriceValidator(),
  requestTimeout: 30000,
}

export function setGlobals({
  env,
  sentryProjectId,
  sentryKey,
  ethRpcs,
  deviationBlockOffsets,
  // bAtomRateLimits,
  bAtomPriceLimits,
  // stEthRateLimits,
  atomPriceLimits,
  requestTimeout,
}) {
  globals.env = env || globals.env
  globals.sentryProjectId = sentryProjectId || globals.sentryProjectId
  globals.sentryKey = sentryKey || globals.sentryKey
  globals.ethRpcs = ethRpcs || globals.ethRpcs
  globals.deviationBlockOffsets =
    deviationBlockOffsets || globals.deviationBlockOffsets
  globals.bAtomSafePriceValidator = new BAtomSafePriceValidator({
    deviationBlockOffsets,
    // bAtomRate: bAtomRateLimits,
    bAtomPrice: bAtomPriceLimits,
    // stEthRate: stEthRateLimits,
    atomPrice: atomPriceLimits,
  })
  globals.requestTimeout = requestTimeout || globals.requestTimeout
}
