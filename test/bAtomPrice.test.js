import assert from 'assert'
import BigNumber from 'bignumber.js'
import { ContractFactory, providers } from 'ethers'
import fetch from 'node-fetch'
import { bAtomPriceSafe, setContractAddresses } from '../src/bAtomPrice.js'
import { setGlobals } from '../src/globals'
import ChainLinkAtomUsdPriceFeedStub from './contracts/ChainLinkAtomUsdPriceFeedStub.json'

global.fetch = fetch

const ETH_RPC_NODE = process.env.PRIMARY_RPC

console.log('TESTING BATOMPRICE.TEST.JS')

const bAtomPriceFormula = ({ latestAnswer, dy, rate }) =>
  new BigNumber(latestAnswer)
    .multipliedBy(dy)
    .dividedBy(rate)
    .dividedBy(1e8)
    .toFixed(8)

describe('Test bAtomPriceSafe method', function() {
  this.timeout(50000)
  let signer, chainLinkAtomUsdPriceFeedStub, provider

  before(async () => {
    provider = new providers.JsonRpcProvider(ETH_RPC_NODE)
    signer = provider.getSigner(0)

    const deployedContractStubs = await deployContractStubs(signer)
    chainLinkAtomUsdPriceFeedStub = deployedContractStubs.chainLinkAtomUsdPriceFeedStub
    console.log(deployedContractStubs);
    setGlobals({ ethRpcs: [ETH_RPC_NODE] })
    setContractAddresses({
      chainLinkAtomUsdPriceFeedAddress: chainLinkAtomUsdPriceFeedStub.address,
    })
  })

  it('Test return value is correct', async () => {
    const iterations = 30
    let i = 0
    while (i < iterations) {
      const testCase = {
        latestAnswer: bigRandom(1e8, 8e9), // value in range [1.0000000000, 80.0000000000]
        // dy: bigRandom(0.9e18, 1.2e18), // value in range [0.9, 1.2]
        // rate: bigRandom(1e18, 3e18), // value in range [1, 3]
      }
      console.log(`Iteration #${i + 1}`)
      console.log('ATOM Price:', formatBigNumber(testCase.latestAnswer, 8))
      // console.log("Curve's Pool DY:", formatBigNumber(testCase.dy))
      // console.log('stETH/bAtom rate:', formatBigNumber(testCase.rate))
      await Promise.all([
        chainLinkAtomUsdPriceFeedStub.setValue(testCase.latestAnswer),
        // curvePoolStub.setValue(testCase.dy),
        // anchorVaultStub.setValue(testCase.rate),
      ])
      const expectedResult = bAtomPriceFormula(testCase)
      const actualResult = await bAtomPriceSafe()
      console.log('Result Value:', actualResult)
      console.log('Expected Value:', expectedResult)
      console.log()
      assert.strictEqual(expectedResult, actualResult)
      ++i
    }
  })

  it('Test validation passes correctly', async () => {
    const deviationBlockOffsets = [3, 6, 9]
    setGlobals({
      deviationBlockOffsets,
      bAtomPriceLimits: {
        maxValue: 36,
        minValue: 25,
        maxDeviations: [0.4, 0.3, 0.2],
      },
      atomPriceLimits: {
        maxValue: 35,
        minValue: 25,
        maxDeviations: [0.3, 0.15, 0.12],
      },
      /* bAtomRateLimits: {
        maxValue: 1.05,
        minValue: 1,
        maxDeviations: [10, 5, 5],
      },
      stEthRateLimits: {
        maxValue: 1.05,
        minValue: 0.92,
        maxDeviations: [10, 5, 1],
      }, */
    })

    const deviationTestValues = [
      {
        latestAnswer: bigRandom(3e9), // 30
        // dy: bigRandom(0.995e18), // 0.995
        // rate: bigRandom(1e18), // 1
      },
      {
        latestAnswer: bigRandom(3.1e9), // 31
        // dy: bigRandom(0.994e18), // 0.994
        // rate: bigRandom(1.01e18), // 1.01
      },
      {
        latestAnswer: bigRandom(3.5e9), // 35
        // dy: bigRandom(1.001e18), // 1.001
        // rate: bigRandom(1.002e18), // 1.002
      },
      {
        latestAnswer: bigRandom(2.7e9), // 27
        // dy: bigRandom(0.993e18), // 0.993
        // rate: bigRandom(1.05e18), // 1.05
      },
    ]

    for (let i = 0; i < deviationTestValues.length; ++i) {
      const testCase = deviationTestValues[i]
      await Promise.all([
        chainLinkAtomUsdPriceFeedStub.setValue(testCase.latestAnswer),
        // curvePoolStub.setValue(testCase.dy),
        // anchorVaultStub.setValue(testCase.rate),
      ])
    }
    const actualResult = await bAtomPriceSafe()
    const expectedResult = bAtomPriceFormula(
      deviationTestValues[deviationTestValues.length - 1],
    )
    assert.strictEqual(expectedResult, actualResult)
  })
})

// Deploys stubs of real contracts used in method bAtomPrice().
// Stubs has one required method used in calculation:
// - AnchorVaultStub - get_rate()
// - CurvePoolStubFactory - get_dy(i,j,dx)
// - ChainLinkAtomUsdPriceFeedStubFactory - latestAnswer()
// additionally every contract has helper method setValue(newValue) to
// set returning value of contract and view value() to retrieve current value
const deployContractStubs = async signer => {
  /* const AnchorVaultStubFactory = ContractFactory.fromSolidity(
    AnchorVaultStub,
    signer,
  )
  const CurvePoolStubFactory = ContractFactory.fromSolidity(
    CurvePoolStub,
    signer,
  ) */
  const ChainLinkAtomUsdPriceFeedStubFactory = ContractFactory.fromSolidity(
    ChainLinkAtomUsdPriceFeedStub,
    signer,
  )
  const [
    // anchorVaultStub,
    // curvePoolStub,
    chainLinkAtomUsdPriceFeedStub,
  ] = await Promise.all([
    // AnchorVaultStubFactory.deploy(),
    // CurvePoolStubFactory.deploy(),
    ChainLinkAtomUsdPriceFeedStubFactory.deploy(),
  ])
  return { chainLinkAtomUsdPriceFeedStub }
}

const bigRandom = (min, max = min) => {
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
