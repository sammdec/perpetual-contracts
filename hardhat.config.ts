import dotenv from "dotenv"
dotenv.config()

import { HardhatUserConfig } from "hardhat/config"
import "@nomicfoundation/hardhat-toolbox"
import "hardhat-deploy"

const {
  ALCHEMY_MAINNET_URL,
  ALCHEMY_GOERLI_URL,
  ETHERSCAN_API_KEY,
  DEPLOYER_PRIVATE_KEY,
} = process.env

const config: HardhatUserConfig = {
  solidity: { compilers: [{ version: "0.8.18" }, { version: "0.8.17" }] },
  networks: {
    hardhat: {
      forking: {
        url: ALCHEMY_MAINNET_URL as string,
        blockNumber: 17514225,
      },
    },
    mainnet: {
      url: ALCHEMY_MAINNET_URL,
      chainId: 1,
      accounts: [DEPLOYER_PRIVATE_KEY as string],
      verify: {
        etherscan: {
          apiKey: ETHERSCAN_API_KEY,
          apiUrl: "https://api.etherscan.io",
        },
      },
    },
    goerli: {
      url: ALCHEMY_GOERLI_URL as string,
      chainId: 5,
      accounts: [DEPLOYER_PRIVATE_KEY as string],
      verify: {
        etherscan: {
          apiKey: ETHERSCAN_API_KEY,
          apiUrl: "https://api-goerli.etherscan.io",
        },
      },
    },
    zora: {
      url: "https://rpc.zora.co",
      chainId: 7777777,
      accounts: [DEPLOYER_PRIVATE_KEY as string],
    },
    "zora-testnet": {
      url: "https://testnet.rpc.zora.co",
      chainId: 999,
      accounts: [DEPLOYER_PRIVATE_KEY as string],
    },
  },
  namedAccounts: {
    deployer: 0,
  },
}

export default config
