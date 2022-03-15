import BigNumber from 'bignumber.js'
import { Contract } from './Contract'
import { ethBlockNumber } from './ethNodeRpc'
import { globals } from './globals'



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


let ChainLinkAtomUsdPriceFeed = ChainLinkAtomUsdPriceFeedFactory(
  '0x736E09DE064A2a461F197643A26bC1ab7Dc4D5D3',
)

export function setContractAddresses(addresses) {
  ChainLinkAtomUsdPriceFeed = ChainLinkAtomUsdPriceFeedFactory(
    addresses.chainLinkAtomUsdPriceFeedAddress,
  )
}

/**
 * Provides current price of bAtom token with safety validations.
 * Validations are defined via globals variable. In case of unsafe price throws an error.
 * @returns current price of bATOM token
 */
export async function bAtomPriceSafe() {
  const { deviationBlockOffsets, bAtomSafePriceValidator } = globals
  const [currentPriceInfo, currentBlockHex] = await Promise.all([
    bAtomPriceInfo(),
    ethBlockNumber(),
  ])
  const referenceValues = await Promise.all(
    deviationBlockOffsets
      .map(offset => currentBlockHex - offset)
      .map(async blockNumber => [
        blockNumber,
        await bAtomPriceInfo('0x' + blockNumber.toString(16)),
      ]),
  )


  bAtomSafePriceValidator.validate(
    Number(currentBlockHex),
    currentPriceInfo,
    referenceValues,
  )
  return currentPriceInfo.bAtomPrice.toFixed(8)
}

/**
 * Makes RPC requests to the ChainLink ATOM/USD pair to retrieve
 * current ATOM price in USD (atomPrice)
 * Calculates bAtomPrice as directly associating with the price of ATOM/usd
 * @returns current object contained keys: atomPrice, bAtomPrice, which have type BigNumber.
 */
async function bAtomPriceInfo(blockNumber) {
  const [atomPrice] = await Promise.all([getAtomPrice(blockNumber)])

  return {
    atomPrice,
    bAtomPrice: atomPrice,
  }
}

/**
 * Calls method latestAnswer on ChainLink contract with ETH/USD pair
 * @returns Current ETH price in USD rounded to 8 digits
 */
async function getAtomPrice(blockNumber) {
  const [latestAnswer] = await ChainLinkAtomUsdPriceFeed.makeCall(
    'latestAnswer',
    [],
    blockNumber,
  )
  return new BigNumber(latestAnswer.toString()).div(1e8)
}
