import BigNumber from 'bignumber.js'
import { Contract } from './Contract'
import { ethBlockNumber } from './ethNodeRpc'
import { globals } from './globals'

const CurvePoolFactory = address =>
  new Contract({
    address,
    abi: [
      {
        name: 'get_dy',
        outputs: [{ type: 'uint256', name: '' }],
        inputs: [
          { type: 'int128', name: 'i' },
          { type: 'int128', name: 'j' },
          { type: 'uint256', name: 'dx' },
        ],
        stateMutability: 'view',
        type: 'function',
      },
    ],
  })

const ChainLinkEthUsdPriceFeedFactory = address =>
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

const AnchorVaultFactory = address =>
  new Contract({
    address,
    abi: [
      {
        stateMutability: 'view',
        type: 'function',
        name: 'get_rate',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
      },
    ],
  })

let CurvePool = CurvePoolFactory('0xDC24316b9AE028F1497c275EB9192a3Ea0f67022')
let ChainLinkEthUsdPriceFeed = ChainLinkEthUsdPriceFeedFactory(
  '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
)
let AnchorVault = AnchorVaultFactory(
  '0xA2F987A546D4CD1c607Ee8141276876C26b72Bdf',
)

export function setContractAddresses(addresses) {
  CurvePool = CurvePoolFactory(addresses.curvePoolAddress)
  ChainLinkEthUsdPriceFeed = ChainLinkEthUsdPriceFeedFactory(
    addresses.chainLinkEthUsdPriceFeedAddress,
  )
  AnchorVault = AnchorVaultFactory(addresses.anchorVault)
}

/**
 * Provides current price of bEth token with safety validations.
 * Validations are defined via globals variable. In case of unsafe price throws an error.
 * @returns current price of bETH token
 */
export async function bEthPriceSafe() {
  const { deviationBlockOffsets, bEthSafePriceValidator } = globals
  const [currentPriceInfo, currentBlockHex] = await Promise.all([
    bEthPriceInfo(),
    ethBlockNumber(),
  ])
  const referenceValues = await Promise.all(
    deviationBlockOffsets
      .map(offset => currentBlockHex - offset)
      .map(async blockNumber => [
        blockNumber,
        await bEthPriceInfo('0x' + blockNumber.toString(16)),
      ]),
  )
  bEthSafePriceValidator.validate(
    Number(currentBlockHex),
    currentPriceInfo,
    referenceValues,
  )
  return currentPriceInfo.bEthPrice.toFixed(8)
}

/**
 * Makes RPC requests to the ChainLink ETH/USD pair to retrieve
 * current ETH price in USD (ethPrice) and calls the Curve stETH pool to get current rate
 * of stETH/ETH pair (stEthRate) and calls AnchorVaults' get_rate() method to get current stETH/bETH rate (bEthRate).
 * Calculates bEthPrice as product of the stETH/ETH rate and ETH price in USD divided by bETH/stETH rate
 * @returns current object contained keys: ethPrice, stEthRate, bEthRate, bEthPrice, which have type BigNumber.
 */
async function bEthPriceInfo(blockNumber) {
  const [ethPrice, stEthRate, bEthRate] = await Promise.all([
    getEthPrice(blockNumber),
    getStEthEthRate(blockNumber),
    getBEthRate(blockNumber),
  ])

  return {
    ethPrice,
    stEthRate,
    bEthRate,
    bEthPrice: ethPrice.multipliedBy(stEthRate).dividedBy(bEthRate),
  }
}

/**
 * Calls method get_dy(1, 0, 1e18) on curve contract to get current price in ETH of one stETH token
 * @returns Current stETH/ETH rate
 */
async function getStEthEthRate(blockNumber) {
  const [pegInWei] = await CurvePool.makeCall(
    'get_dy',
    [
      1,
      0,
      (1e18).toFixed(), // convert to String to except Number overflow error in ethers BigNumber library.
    ],
    blockNumber,
  )
  return new BigNumber(pegInWei.toString()).div(1e18)
}

/**
 * Calls method latestAnswer on ChainLink contract with ETH/USD pair
 * @returns Current ETH price in USD rounded to 8 digits
 */
async function getEthPrice(blockNumber) {
  const [latestAnswer] = await ChainLinkEthUsdPriceFeed.makeCall(
    'latestAnswer',
    [],
    blockNumber,
  )
  return new BigNumber(latestAnswer.toString()).div(1e8)
}

/**
 * Calls method get_rate on AnchorVault contract.
 * @returns Current stETH/bETH rate. The result is always greater or equal than 1.
 */
async function getBEthRate(blockNumber) {
  const [rateInWei] = await AnchorVault.makeCall('get_rate', [], blockNumber)
  return new BigNumber(rateInWei.toString()).div(1e18)
}
