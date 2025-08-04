"""Governance monitoring agent.
Subscribes to Hardhat node events and drafts improvement proposals."""

import os
import json
import time
from web3 import Web3
from langchain.chat_models import ChatOpenAI


def main() -> None:
    ws = os.getenv("WS_URL", "ws://localhost:8545")
    w3 = Web3(Web3.WebsocketProvider(ws))
    treasury_address = os.getenv("TREASURY_ADDRESS")
    if not treasury_address:
        raise SystemExit("TREASURY_ADDRESS not set")

    with open("artifacts/contracts/TreasuryAgent.sol/TreasuryAgent.json") as f:
        abi = json.load(f)["abi"]
    contract = w3.eth.contract(address=treasury_address, abi=abi)

    llm = ChatOpenAI(model="gpt-4o-mini")
    event_filter = contract.events.Rebalanced.create_filter(fromBlock="latest")
    print("Monitoring TreasuryAgent for rebalance events...")
    while True:
        for event in event_filter.get_new_entries():
            proposal_text = llm.invoke(
                [
                    {
                        "role": "user",
                        "content": f"Treasury rebalanced at {event['args']}. Suggest improvement."
                    }
                ]
            ).content
            proposal_id = Web3.keccak(text=proposal_text).hex()
            print("Generated proposal", proposal_id)
        time.sleep(5)


if __name__ == "__main__":
    main()
