const hre = require("hardhat");

async function main() {
  console.log("Deploying InspectionAudit smart contract...");

  const signers = await hre.ethers.getSigners();
  if (!signers || signers.length === 0) {
    console.error("\n[ERROR] No wallet signer found for network 'amoy'.");
    console.error("Please ensure BLOCKCHAIN_PRIVATE_KEY in backend/.env is set to a valid 64-character hex key starting with '0x...'\n");
    process.exit(1);
  }

  const deployer = signers[0];
  console.log("Deployer Wallet Address:", deployer.address);

  const balance = await deployer.getBalance();
  console.log("Wallet Balance:", hre.ethers.utils.formatEther(balance), "MATIC");

  if (balance.eq(0)) {
    console.error("\n[ERROR] Wallet balance is 0 MATIC. Please add MATIC tokens or claim from https://faucet.polygon.technology before deploying.\n");
    process.exit(1);
  }

  const InspectionAudit = await hre.ethers.getContractFactory("InspectionAudit", deployer);
  const contract = await InspectionAudit.deploy();

  await contract.deployed();

  console.log("\n======================================================================");
  console.log(`SUCCESS! InspectionAudit contract deployed to Polygon Amoy:`);
  console.log(`Contract Address: ${contract.address}`);
  console.log(`Polygonscan Explorer: https://amoy.polygonscan.com/address/${contract.address}`);
  console.log("======================================================================\n");
  console.log(`Please copy the contract address above and add it to backend/.env:`);
  console.log(`BLOCKCHAIN_CONTRACT_ADDRESS="${contract.address}"\n`);
}

main().catch((error) => {
  console.error("Deployment failed with error:", error);
  process.exitCode = 1;
});
