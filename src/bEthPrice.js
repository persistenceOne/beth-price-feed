import BigNumber from 'bignumber.js'
import { Contract } from './Contract'
import { CHAIN_IDS } from './constants'

/**
 * Provides current price of bEth token.
 * Under the hood makes RPC requests to the ChainLink ETH/USD pair to retrieve
 * current ETH price in USD and calls the Curve stETH pool to get current rate
 * of stETH/ETH pair and calls AnchorVaults' get_rate() method to get current stETH/bETH rate.
 * Returns product of the peg and ETH price in used divided by bETH/stETH rate rounded to 8 digits.
 * @returns current price of bETH token
 */
export async function bEthPrice() {
  const [peg, price, bEthRate] = await Promise.all([
    getStEthEthPeg(),
    getEthPrice(),
    getBEthRate(),
  ])
  return peg
    .multipliedBy(price)
    .div(bEthRate)
    .toFixed(8)
}

/**
 * Calls method get_dy(1, 0, 1e18) on curve contract to get current price in ETH of one stETH token
 * @returns Current stETH/ETH rate
 */
async function getStEthEthPeg() {
  const [pegInWei] = await CurvePool.makeCall(CHAIN_ID, 'get_dy', [
    1,
    0,
    (1e18).toFixed(), // convert to String to except Number overflow error in ethers BigNumber library.
  ])
  return new BigNumber(pegInWei).div(1e18)
}

/**
 * Calls method latestAnswer on ChainLink contract with ETH/USD pair
 * @returns Current ETH price in USD rounded to 8 digits
 */
async function getEthPrice() {
  const [latestAnswer] = await ChainLinkEthUsdPriceFeed.makeCall(
    CHAIN_ID,
    'latestAnswer',
    [],
  )
  return new BigNumber(latestAnswer.toString()).div(1e8)
}

/**
 * Calls method get_rate on AnchorVault contract.
 * @returns Current stETH/bETH rate. The result is always greater or equal than 1.
 */
async function getBEthRate() {
  const [rateInWei] = await AnchorVault.makeCall(CHAIN_ID, 'get_rate', [])
  return new BigNumber(rateInWei.toString()).div(1e18)
}

const CurvePool = new Contract({
  addresses: {
    [CHAIN_IDS.mainnet]: '0xDC24316b9AE028F1497c275EB9192a3Ea0f67022',
    [CHAIN_IDS.goerli]: '0xCEB67769c63cfFc6C8a6c68e85aBE1Df396B7aDA',
  },
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

const ChainLinkEthUsdPriceFeed = new Contract({
  addresses: {
    [CHAIN_IDS.mainnet]: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
    [CHAIN_IDS.rinkeby]: '0x8A753747A1Fa494EC906cE90E9f37563A8AF630e',
    [CHAIN_IDS.kovan]: '0x9326BFA02ADD2366b30bacB125260Af641031331',
  },
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

const AnchorVault = new Contract({
  addresses: {
    [CHAIN_IDS.ropsten]: '0xf72B5bC0a05f15CaDB6731e59C7D99C1bFbB2FAb',
  },
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
