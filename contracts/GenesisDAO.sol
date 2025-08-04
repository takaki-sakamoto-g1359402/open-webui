// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

/// @title GenesisDAO Governance Token
/// @notice ERC20 token with UUPS upgradeability and emergency pause by guardian multisig.
contract GenesisDAO is ERC20Upgradeable, UUPSUpgradeable, OwnableUpgradeable, PausableUpgradeable {
    /// @notice DAO constitution storage mapping
    mapping(bytes32 => bytes) public constitution;

    /// @notice guardian multisig address allowed to pause
    address public guardian;

    /// @notice initializer instead of constructor for upgradeable contract
    /// @param _guardian address of guardian multisig
    function initialize(address _guardian) public initializer {
        __ERC20_init("Genesis DAO", "GDAO");
        __Ownable_init();
        __Pausable_init();
        __UUPSUpgradeable_init();
        _mint(msg.sender, 1_000_000 * 10 ** decimals());
        guardian = _guardian;
    }

    /// @notice pause the contract, only guardian multisig can call
    function pause() external {
        require(msg.sender == guardian, "Not guardian");
        _pause();
    }

    /// @notice unpause the contract, only owner (DAO) can call
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice update constitution by key
    function setArticle(bytes32 key, bytes calldata value) external onlyOwner {
        constitution[key] = value;
    }

    /// @dev authorize upgrades, restricted to owner (DAO)
    function _authorizeUpgrade(address) internal override onlyOwner {}

    /// @dev before token transfer hook to enforce pause
    function _beforeTokenTransfer(address from, address to, uint256 amount) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }
}
