import { assert } from 'chai'
import { setGlobals } from '../src/globals'
import { getbAtomPriceSafeStandalone } from '../src/standalone'

describe('getbAtomPriceSafeStandalone', () => {
  it('should resolve latest known price', async () => {
    setGlobals({
      ethRpcs: ['http://127.0.0.1:8545/'],
      requestTimeout: 30000,
    })

    const price = await getbAtomPriceSafeStandalone()
    assert.isDefined(price)
  })

  it('should throw upon timeout', async () => {
    setGlobals({
      ethRpcs: ['http://127.0.0.1:8545/'],
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
