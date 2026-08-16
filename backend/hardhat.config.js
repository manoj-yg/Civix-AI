require("dotenv").config();
require("@nomiclabs/hardhat-ethers");

let rawKey = (process.env.BLOCKCHAIN_PRIVATE_KEY || "").trim().replace(/^["']|["']$/g, "");
if (rawKey && !rawKey.startsWith("0x")) {
  rawKey = "0x" + rawKey;
}
const accounts = (rawKey && rawKey.length === 66) ? [rawKey] : [];

module.exports = {
  solidity: "0.8.20",
  paths: {
    sources: "./app/blockchain/contracts",
    tests: "./tests",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    amoy: {
      url: process.env.BLOCKCHAIN_RPC_URL || "https://polygon-amoy-bor-rpc.publicnode.com",
      accounts: accounts,
      chainId: 80002
    }
  }
};
