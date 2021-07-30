export const globals = {
  env: 'development',
  sentryProjectId: '',
  sentryKey: '',
  ethRpcs: [],
}

export function setGlobals({ env, sentryProjectId, sentryKey, ethRpcs }) {
  globals.env = env || globals.env
  globals.sentryProjectId = sentryProjectId || globals.sentryProjectId
  globals.sentryKey = sentryKey || globals.sentryKey
  globals.ethRpcs = ethRpcs || globals.ethRpcs
}
