import BigNumber from 'bignumber.js'
import { ethCall } from './ethNodeRpc'

/**
 * Provides current price of bEth token.
 * Under the hood makes RPC requests to the chainlink usd/eth pair and to the
 * curve stEth pool to get current peg of eth/stEth pair. Returns product of
 * the peg and ETH price in used rounded to 8 digits.
 * @returns current price of bEthToken
 */
export async function bEthPrice() {
  const [peg, price] = await Promise.all([stEthEthPeg(), ethPrice()])
  return peg.multipliedBy(price).toFixed(8)
}

/**
 * Calls method get_dy(1, 0, 1e18) on curve contract to get current price in eth of 1 stEth token
 * @returns Current eth/stEth peg
 */
async function stEthEthPeg() {
  const curvePoolContract = '0xDC24316b9AE028F1497c275EB9192a3Ea0f67022'
  const params = [
    '0x5e0d443f', // get_dy() method id
    '0000000000000000000000000000000000000000000000000000000000000001', // 1
    '0000000000000000000000000000000000000000000000000000000000000000', // 0
    '0000000000000000000000000000000000000000000000000de0b6b3a7640000', // 1e18
  ]
  const result = await ethCall([
    {
      to: curvePoolContract,
      data: params.join(''),
    },
    'latest',
  ])
  return new BigNumber(result).div(1e18)
}

/**
 * Calls method latestRoundData on Chainlink contract with ETH/USD pair
 * @returns Current ETH price in USD rounded to 8 digits
 */
async function ethPrice() {
  const result = await ethCall([
    {
      to: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', // eth/usd chainlink pair
      data: '0xfeaf968c', // latestRoundData
    },
    'latest',
  ])
  const precisionDivider = 1e8
  const answerBytes = result.slice(66, 130) // get answer from result
  return new BigNumber('0x' + answerBytes).div(precisionDivider)
}
