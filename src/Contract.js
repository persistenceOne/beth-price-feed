import { ethCall } from './ethNodeRpc'
import { Interface } from '@ethersproject/abi'

export class Contract {
  constructor({ address, abi }) {
    this.address = address
    this.interface = new Interface(abi)
  }

  async makeCall(methodName, params = [], blockNumber = 'latest') {
    console.log(
      'this.address: ',
      this.address,
      ' this.data: ',
      this.interface.encodeFunctionData(methodName, params),
      ' blocknumber: ',
      blockNumber,
    )

    const res = await ethCall([
      {
        to: this.address,
        data: this.interface.encodeFunctionData(methodName, params),
      },
      blockNumber,
    ])
    return this.interface.decodeFunctionResult(methodName, res)
  }
}
