import { assert } from 'chai'
import { setGlobals } from '../src/globals'
import { getBatomPriceSafeStandalone } from '../src/standalone'
import { Contract } from '../src/Contract'

console.log('TESTING STANDALONE.TEST.JS')

describe('getBatomPriceSafeStandalone', () => {
  it('should resolve latest known price', async () => {
    const ChainLinkAtomUsdPriceFeedFactory = address =>
      new Contract({
        address,
        abi: [
          {
            inputs: [],
            name: 'latestAnswer',
            outputs: [{ internalType: 'int256', name: '', type: 'int256' }],
            stateMutability: 'view',
            type: 'function',
          },
        ],
      })

    console.log(
      'ChainLinkAtomUsdPriceFeedFactory: ',
      ChainLinkAtomUsdPriceFeedFactory,
    )

    let ChainLinkAtomUsdPriceFeed = ChainLinkAtomUsdPriceFeedFactory(
      process.env.CHAINLINK_CONTRACT_ADDRESS,
    )

    console.log(
      'ChainLinkAtomUsdPriceFeed: ',
      ChainLinkAtomUsdPriceFeed.address,
    )
    
    const [latestAnswer] = await ChainLinkAtomUsdPriceFeed.makeCall(
      'latestAnswer',
      [],
    )
    console.log('latestAnswer: ', latestAnswer)
    if (latestAnswer) {
      latestAnswer
    }

    setGlobals({
      ethRpcs: [process.env.ETH_RPCS],
      requestTimeout: 30000,
    })

    const price = await getBatomPriceSafeStandalone()
    assert.isDefined(price)
  })

  it('should throw upon timeout', async () => {
    setGlobals({
      ethRpcs: [process.env.ETH_RPCS],
      requestTimeout: 1,
    })

    getBatomPriceSafeStandalone()
      .catch(err => assert.isDefined(err))
      .then(() => {
        // should never arrive here
        assert.fail()
      })
  })
})
