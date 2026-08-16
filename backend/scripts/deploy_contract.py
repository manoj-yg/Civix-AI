"""
Python Smart Contract Deployment Script (Web3.py)
Deploys InspectionAudit contract directly using Python Web3 to any EVM RPC endpoint.
"""
import sys
import json
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.core.config import settings

def main():
    print(f"Connecting to EVM Node at: {settings.BLOCKCHAIN_RPC_URL}...")
    
    try:
        from web3 import Web3
        w3 = Web3(Web3.HTTPProvider(settings.BLOCKCHAIN_RPC_URL))
        if not w3.is_connected():
            print(f"Error: Unable to connect to EVM node at {settings.BLOCKCHAIN_RPC_URL}")
            sys.exit(1)
        print(f"Connected to EVM Node! Chain ID: {w3.eth.chain_id}")
    except Exception as e:
        print(f"Error initializing Web3 client: {e}")
        sys.exit(1)

    private_key = settings.BLOCKCHAIN_PRIVATE_KEY
    if not private_key or private_key == "YOUR_POLYGON_PRIVATE_KEY_HERE" or not private_key.startswith("0x"):
        print("\nERROR: BLOCKCHAIN_PRIVATE_KEY is missing or unconfigured in backend/.env!")
        print("Please edit backend/.env and set BLOCKCHAIN_PRIVATE_KEY=\"0x...\" with your private key.")
        sys.exit(1)

    account = w3.eth.account.from_key(private_key)
    print(f"Deployer Wallet Address: {account.address}")
    
    balance_wei = w3.eth.get_balance(account.address)
    balance_eth = w3.from_wei(balance_wei, 'ether')
    print(f"Wallet Balance: {balance_eth} MATIC")

    if balance_wei == 0:
        print(f"\nERROR: Wallet {account.address} has 0 MATIC balance!")
        print("Please claim free test MATIC from https://faucet.polygon.technology before deploying.")
        sys.exit(1)

    artifact_path = ROOT_DIR / "artifacts" / "app" / "blockchain" / "contracts" / "InspectionAudit.sol" / "InspectionAudit.json"
    if not artifact_path.exists():
        print(f"Artifact not found at {artifact_path}. Please run 'npx hardhat compile' first.")
        sys.exit(1)

    with open(artifact_path, "r", encoding="utf-8") as f:
        artifact = json.load(f)

    abi = artifact["abi"]
    bytecode = artifact["bytecode"]

    contract = w3.eth.contract(abi=abi, bytecode=bytecode)
    
    nonce = w3.eth.get_transaction_count(account.address)
    gas_price = w3.eth.gas_price

    print("Building deployment transaction...")
    tx = contract.constructor().build_transaction({
        'from': account.address,
        'nonce': nonce,
        'gasPrice': int(gas_price * 1.2),
        'chainId': settings.BLOCKCHAIN_CHAIN_ID
    })

    signed_tx = w3.eth.account.sign_transaction(tx, private_key)
    print("Broadcasting transaction to Polygon Amoy Testnet...")
    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
    print(f"Transaction sent! Tx Hash: {tx_hash.hex()}")

    print("Waiting for block confirmation...")
    tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)

    contract_address = tx_receipt.contractAddress
    print("\n" + "="*70)
    print(f"SUCCESS! InspectionAudit contract deployed to Polygon Amoy:")
    print(f"Contract Address: {contract_address}")
    print(f"Block Number: {tx_receipt.blockNumber}")
    print(f"Polygonscan Explorer: https://amoy.polygonscan.com/address/{contract_address}")
    print("="*70)
    print("\nPlease copy the contract address above and add it to backend/.env:")
    print(f"BLOCKCHAIN_CONTRACT_ADDRESS=\"{contract_address}\"\n")

if __name__ == "__main__":
    main()
