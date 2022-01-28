import { assert } from 'chai'
import { setGlobals } from '../src/globals'
import { getbAtomPriceSafeStandalone } from '../src/standalone'

describe('getbAtomPriceSafeStandalone', () => {
  it('should resolve latest known price', async () => {
    setGlobals({
      ethRpcs: [process.env.ETH_RPCS],
      requestTimeout: 30000,
    })

    const price = await getbAtomPriceSafeStandalone()
    assert.isDefined(price)
  })

  it('should throw upon timeout', async () => {
    setGlobals({
      ethRpcs: [process.env.ETH_RPCS],
      requestTimeout: 1,
    })

    getbAtomPriceSafeStandalone()
      .catch(err => assert.isDefined(err))
      .then(() => {
        // should never arrive here
        assert.fail()
      })
  })
})
