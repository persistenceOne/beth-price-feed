import { ethCall } from './ethNodeRpc'
import { Interface } from '@ethersproject/abi'

export class Contract {
  constructor({ addresses, abi }) {
    this.addresses = addresses
    this.interface = new Interface(abi)
  }

  async makeCall(chainId, methodName, params) {
    const address = this.addresses[chainId]
    if (!address) {
      throw new Error(
        `Address of contract not provided for chain id = ${chainId}`,
      )
    }
    const res = await ethCall([
      {
        to: address,
        data: this.interface.encodeFunctionData(methodName, params),
      },
      'latest',
    ])
    return this.interface.decodeFunctionResult(methodName, res)
  }
}
