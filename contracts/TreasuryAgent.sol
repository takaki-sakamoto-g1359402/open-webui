// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IGenesisDAO {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
}

/// @title TreasuryAgent
/// @notice Simplified treasury that auto deposits funds and distributes profits to GDAO holders
contract TreasuryAgent {
    IGenesisDAO public gdao;
    address public automation; // Chainlink Automation node
    address public owner;
    address[] public holders;

    event Rebalanced(uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyAutomation() {
        require(msg.sender == automation, "Not automation");
        _;
    }

    constructor(address _automation, address _gdao) {
        automation = _automation;
        gdao = IGenesisDAO(_gdao);
        owner = msg.sender;
    }

    receive() external payable {
        // In production, deposit to Aave here
    }

    /// @notice register holders for profit distribution
    function setHolders(address[] calldata _holders) external onlyOwner {
        holders = _holders;
    }

    /// @notice Chainlink Automation entry point
    function rebalance() external onlyAutomation {
        emit Rebalanced(block.timestamp);
    }

    /// @notice distribute ETH profits to GDAO token holders proportionally
    function distributeProfits() external {
        uint256 total = address(this).balance;
        require(total > 0, "No profits");
        uint256 supply = gdao.totalSupply();
        for (uint256 i = 0; i < holders.length; i++) {
            address h = holders[i];
            uint256 share = (total * gdao.balanceOf(h)) / supply;
            if (share > 0) {
                (bool ok, ) = h.call{value: share}("");
                require(ok, "Transfer failed");
            }
        }
    }
}
