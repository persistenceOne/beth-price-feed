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
  bAtomPriceLimits,
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
    bAtomPrice: bAtomPriceLimits,
    atomPrice: atomPriceLimits,
  })
  globals.requestTimeout = requestTimeout || globals.requestTimeout
}
