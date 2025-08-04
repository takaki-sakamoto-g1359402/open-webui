"""Treasury management agent.
Fetches KPIs via Chainlink price feeds and triggers on-chain rebalances."""

import os
import json
from web3 import Web3
import pandas as pd

# Placeholder KPI fetcher using Chainlink price feed (mocked)
def fetch_kpis() -> pd.Series:
    # In production, use Web3 to read Chainlink feeds
    apr = float(os.getenv("APR", "3.0"))
    tvl = float(os.getenv("TVL", "1000"))
    return pd.Series({"apr": apr, "tvl": tvl})


def main() -> None:
    rpc = os.getenv("RPC_URL", "http://localhost:8545")
    w3 = Web3(Web3.HTTPProvider(rpc))
    treasury_address = os.getenv("TREASURY_ADDRESS")
    if not treasury_address:
        raise SystemExit("TREASURY_ADDRESS not set")

    with open("artifacts/contracts/TreasuryAgent.sol/TreasuryAgent.json") as f:
        abi = json.load(f)["abi"]
    contract = w3.eth.contract(address=treasury_address, abi=abi)
    kpis = fetch_kpis()
    threshold = float(os.getenv("APR_THRESHOLD", "5"))
    if kpis["apr"] < threshold:
        tx = contract.functions.rebalance().transact()
        receipt = w3.eth.wait_for_transaction_receipt(tx)
        print("Rebalance executed", receipt.transactionHash.hex())
    else:
        print("KPI satisfactory", kpis.to_dict())


if __name__ == "__main__":
    main()
