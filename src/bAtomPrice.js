import BigNumber from 'bignumber.js'
import { Contract } from './Contract'
import { ethBlockNumber } from './ethNodeRpc'
import { globals } from './globals'
import { getContractInstance} from "../actions/utils"

import Web3 from 'web3';

//import {abi } from "../abi/abi.json"

const newProvider = () => new Web3.providers.WebsocketProvider(process.env.PRIMARY_RPC);
let web3 = new Web3(newProvider());

/*const CHAINLINK_ATOM_USD_PRICEFEED_CONTRACT =
  process.env.CHAINLINK_CONTRACT_ADDRESS

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
  })*/

/*let ChainLinkAtomUsdPriceFeed = ChainLinkAtomUsdPriceFeedFactory(
  CHAINLINK_ATOM_USD_PRICEFEED_CONTRACT,
)

export function setContractAddresses(addresses) {
  ChainLinkAtomUsdPriceFeed = ChainLinkAtomUsdPriceFeedFactory(
    addresses.chainLinkEthUsdPriceFeedAddress,
  )
}*/

/**
 * Provides current price of bAtom token with safety validations.
 * Validations are defined via globals variable. In case of unsafe price throws an error.
 * @returns current price of bATOM token
 */
export async function bAtomPriceSafe() {
  const { deviationBlockOffsets, bAtomSafePriceValidator } = globals
  const [currentPriceInfo, currentBlockHex] = await Promise.all([
    bAtomPriceInfo(14094995),
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
// eslint-disable-next-line no-unused-vars
async function getAtomPrice(blockNumber) {
  let getData = await getContractInstance(process.env.abi, process.env.CHAINLINK_CONTRACT_ADDRESS)
  console.log("getData: ", getData)

  let getLatestAnswer = await getData.methods.latestAnswer().call();
  console.log("getLatestAnswer: ", getLatestAnswer)
  return getLatestAnswer;

 /* const [latestAnswer] = await ChainLinkAtomUsdPriceFeed.makeCall(
    'latestAnswer',
    [],
    blockNumber,
  )
  return new BigNumber(latestAnswer.toString()).div(1e8)*/
}
