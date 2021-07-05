import BigNumber from 'bignumber.js'
import { Contract } from './Contract'

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
let AnchorVault = AnchorVaultFactory('') // TODO: Add address of contract in mainnet

export function setContractAddresses(addresses) {
  CurvePool = CurvePoolFactory(addresses.curvePoolAddress)
  ChainLinkEthUsdPriceFeed = ChainLinkEthUsdPriceFeedFactory(
    addresses.chainLinkEthUsdPriceFeedAddress,
  )
  AnchorVault = AnchorVaultFactory(addresses.anchorVault)
}

/**
 * Provides current price of bEth token.
 * Under the hood makes RPC requests to the ChainLink ETH/USD pair to retrieve
 * current ETH price in USD and calls the Curve stETH pool to get current rate
 * of stETH/ETH pair and calls AnchorVaults' get_rate() method to get current stETH/bETH rate.
 * Returns product of the peg and ETH price in used divided by bETH/stETH rate rounded to 8 digits.
 * @returns current price of bETH token
 */
export async function bEthPrice() {
  const [ethPrice, stEthRate, bEthRate] = await Promise.all([
    getEthPrice(),
    getStEthEthRate(),
    getBEthRate(),
  ])
  return ethPrice
    .multipliedBy(stEthRate)
    .dividedBy(bEthRate)
    .toFixed(8)
}

/**
 * Calls method get_dy(1, 0, 1e18) on curve contract to get current price in ETH of one stETH token
 * @returns Current stETH/ETH rate
 */
async function getStEthEthRate() {
  const [pegInWei] = await CurvePool.makeCall('get_dy', [
    1,
    0,
    (1e18).toFixed(), // convert to String to except Number overflow error in ethers BigNumber library.
  ])
  return new BigNumber(pegInWei.toString()).div(1e18)
}

/**
 * Calls method latestAnswer on ChainLink contract with ETH/USD pair
 * @returns Current ETH price in USD rounded to 8 digits
 */
async function getEthPrice() {
  const [latestAnswer] = await ChainLinkEthUsdPriceFeed.makeCall('latestAnswer')
  return new BigNumber(latestAnswer.toString()).div(1e8)
}

/**
 * Calls method get_rate on AnchorVault contract.
 * @returns Current stETH/bETH rate. The result is always greater or equal than 1.
 */
async function getBEthRate() {
  const [rateInWei] = await AnchorVault.makeCall('get_rate')
  return new BigNumber(rateInWei.toString()).div(1e18)
}
