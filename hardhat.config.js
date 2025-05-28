require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");
require("hardhat-contract-sizer");
require("dotenv").config();

const {
  TESTNET_PRIVATE_KEY,
  MAINNET_DEPLOYER_PRIVATE_KEY,
  MAINNET_ARCHIVAL_RPC,
  MUMBAI_ARCHIVAL_RPC,
  POLYGON_ARCHIVAL_RPC,
  SEPOLIA_ARCHIVAL_RPC,
} = process.env;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 10000,
        details: {
          yul: true,
        },
      },
    },
  },
  networks: {
    hardhat: {
      chainId: Number(process.env.CHAIN_ID) || 1,
      accounts: {
        mnemonic:
          "dice shove sheriff police boss indoor hospital vivid tenant method game matter",
        path: "m/44'/60'/0'/0",
        initialIndex: 0,
      },
      initialBaseFeePerGas: 0,
      gasPrice: 0,
      gas: 30000000,
    },
    mumbai: {
      url: `${MUMBAI_ARCHIVAL_RPC}`,
      accounts: [
        `${
          TESTNET_PRIVATE_KEY ||
          "0x0000000000000000000000000000000000000000000000000000000000000000"
        }`,
      ],
    },
    polygon: {
      url: `${POLYGON_ARCHIVAL_RPC}`,
      accounts: [
        `${
          MAINNET_DEPLOYER_PRIVATE_KEY ||
          "0x0000000000000000000000000000000000000000000000000000000000000000"
        }`,
      ],
    },
    sepolia: {
      url: `${SEPOLIA_ARCHIVAL_RPC}`,
      accounts: [
        `${
          TESTNET_PRIVATE_KEY ||
          "0x0000000000000000000000000000000000000000000000000000000000000000"
        }`,
      ],
    },
    mainnet: {
      url: `${MAINNET_ARCHIVAL_RPC}`,
      accounts: [
        `${
          MAINNET_DEPLOYER_PRIVATE_KEY ||
          "0x0000000000000000000000000000000000000000000000000000000000000000"
        }`,
      ],
    },
  },
  gasReporter: {
    enabled: false,
    coinmarketcap: "1d8cfd2b-c9b6-4884-a5bb-1f0e033b146c",
    outputFile: "gas-report-eth.txt",
    noColors: true,
    currency: "USD",
    excludeContracts: ["Mock/", "Token/"],
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY || "",
      sepolia: process.env.ETHERSCAN_API_KEY || "",
      polygon: process.env.POLYGONSCAN_API_KEY || "",
      mumbai: process.env.POLYGONSCAN_API_KEY || "",
    },
  },
};
