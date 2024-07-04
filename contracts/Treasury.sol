// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import { ITreasury } from "./interfaces/ITreasury.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {VotesCounter} from "./VotesCounter.sol"; // remove and replace with the address of the deployed contract

contract Treasury is ITreasury, Ownable, VotesCounter {
    using SafeERC20 for IERC20;

    address public governanceToken;
    
    uint8 private _decimals = 8;

    mapping(bytes32 => mapping(uint256 => address)) proposalWinner;

    constructor(address _governanceToken) Ownable() {
        require(_governanceToken != address(0), "Governance token cannot be zero address");
        governanceToken = _governanceToken;
    }

    function setWinningToken(bytes32 proposalId, uint8 option, address winningToken) external onlyOwner {
        _setWinningToken(proposalId, option, winningToken);
    }

    function getTokenBalance() public view returns(uint256) {
        return IERC20(governanceToken).balanceOf(address(this));
    }

    function getWinningToken(bytes32 proposalId, uint8 option) public view returns(address) {
        return proposalWinner[proposalId][option];
    }

    function _transferVoteToken(uint256 amount) internal {
        uint256 amountToTransfer = amount * 10**_decimals;
        uint256 senderBalance = IERC20(governanceToken).balanceOf(msg.sender);

        require(senderBalance >= amountToTransfer, "Insufficient funds");
        bool approved = IERC20(governanceToken).approve(address(this), amountToTransfer);
        
        require(approved && (amount > 0), "Approval failed");
        IERC20(governanceToken).safeTransferFrom(msg.sender, address(this), amountToTransfer);
    }

    function _setWinningToken(bytes32 proposalId, uint8 option, address winningToken) internal {
        proposalWinner[proposalId][option] = winningToken;
    }
    
    function _burn(uint256 amount) internal {
        uint256 amountToBurn = amount * 10**_decimals;
        uint256 governanceTokenBalance = IERC20(governanceToken).balanceOf(address(this));
        require(governanceTokenBalance >= amountToBurn, "Insufficient funds");

        IERC20(governanceToken).safeTransferFrom(address(this), address(0), amountToBurn);
    }
}