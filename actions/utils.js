import Web3 from 'web3';

const newProvider = () => new Web3.providers.WebsocketProvider(process.env.PRIMARY_RPC);
let web3 = new Web3(newProvider());

export const getContractInstance = async(abi, address) => {
  const contractInstance = new web3.eth.Contract(
    JSON.parse(abi),
    address
  );
  console.log("contractInstance: ", contractInstance.methods)

  return contractInstance;
}