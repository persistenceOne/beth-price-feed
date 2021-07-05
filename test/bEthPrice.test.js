import assert from 'assert'
import fetch from 'node-fetch'
import BigNumber from 'bignumber.js'

import { bEthPrice, setContractAddresses } from '../src/bEthPrice.js'
import { setGlobals } from '../src/globals'
import { ContractFactory, providers } from 'ethers'
import AnchorVaultStub from './contracts/AnchorVaultStub.json'
import CurvePoolStub from './contracts/CurvePoolStub.json'
import ChainLinkEthUsdPriceFeedStub from './contracts/ChainLinkEthUsdPriceFeedStub.json'

global.fetch = fetch

const ETH_RPC_NODE = 'http://127.0.0.1:8545/'

const bEthPriceFormula = ({ latestAnswer, dy, rate }) =>
  new BigNumber(latestAnswer)
    .multipliedBy(dy)
    .dividedBy(rate)
    .dividedBy(1e8)
    .toFixed(8)

describe('Test bEthPrice method', function() {
  this.timeout(50000)
  let signer, anchorVaultStub, curvePoolStub, chainLinkEthUsdPriceFeedStub

  before(async () => {
    const provider = new providers.JsonRpcProvider(ETH_RPC_NODE)
    signer = await provider.getSigner(0)
    const AnchorVaultFactory = ContractFactory.fromSolidity(
      AnchorVaultStub,
      signer,
    )
    anchorVaultStub = await AnchorVaultFactory.deploy()
    const CurvePoolFactory = ContractFactory.fromSolidity(CurvePoolStub, signer)
    curvePoolStub = await CurvePoolFactory.deploy()
    const ChainLinkEthUsdPriceFeedFactory = ContractFactory.fromSolidity(
      ChainLinkEthUsdPriceFeedStub,
      signer,
    )
    chainLinkEthUsdPriceFeedStub = await ChainLinkEthUsdPriceFeedFactory.deploy()
    setGlobals({ ethRpcs: [ETH_RPC_NODE] })
    setContractAddresses({
      curvePoolAddress: curvePoolStub.address,
      chainLinkEthUsdPriceFeedAddress: chainLinkEthUsdPriceFeedStub.address,
      anchorVault: anchorVaultStub.address,
    })
  })

  it('Test return value', async () => {
    const iterations = 30
    let i = 0
    while (i < iterations) {
      const testCase = {
        latestAnswer: bigRandom(1e10, 8e11), // value in range [100.00000000, 8000.00000000]
        dy: bigRandom(0.9e18, 1.2e18), // value in range [0.85, 1.5]
        rate: bigRandom(1e18, 3e18), // value in range [1, 10]
      }
      console.log(`Iteration #${i + 1}`)
      console.log('ETH Price:', formatBigNumber(testCase.latestAnswer, 8))
      console.log("Curve's Pool DY:", formatBigNumber(testCase.dy))
      console.log('stETH/bETH rate:', formatBigNumber(testCase.rate))
      await Promise.all([
        chainLinkEthUsdPriceFeedStub.setValue(testCase.latestAnswer),
        curvePoolStub.setValue(testCase.dy),
        anchorVaultStub.setValue(testCase.rate),
      ])
      const expectedResult = bEthPriceFormula(testCase)
      const actualResult = await bEthPrice()
      console.log('Result Value:', actualResult)
      console.log('Expected Value:', expectedResult)
      console.log()
      assert.strictEqual(expectedResult, actualResult)
      ++i
    }
  })
})

const bigRandom = (min, max) => {
  const rangeLength = BigNumber(max).minus(min)
  return BigNumber.random(10)
    .multipliedBy(rangeLength)
    .plus(min)
    .decimalPlaces(0)
    .toString()
}

const formatBigNumber = (value, decimals = 18) =>
  BigNumber(value)
    .dividedBy(Math.pow(10, decimals))
    .toString()
