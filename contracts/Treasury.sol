// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import { ITreasury } from "./interfaces/ITreasury.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { VotesCounter } from "./VotesCounter.sol";

interface IERC20Burnable is IERC20 {
    function burn(uint256 amount) external;
}

contract Treasury is ITreasury, Ownable, VotesCounter {
    using SafeERC20 for IERC20;

    address public governanceToken;
    uint8 private _decimals;

    mapping(bytes32 => mapping(uint256 => address)) private _proposalWinner;

    constructor(address _governanceToken) Ownable() {
        if (_governanceToken == address(0)) revert ZeroAddress();
        governanceToken = _governanceToken;
        _decimals = IERC20Metadata(_governanceToken).decimals();
    }

    /**
     * @dev See {ITreasury-setWinningToken}.
     */
    function setWinningToken(
        bytes32 proposalId,
        uint8 option,
        address winningToken
    ) external onlyOwner {
        _setWinningToken(proposalId, option, winningToken);
    }

    function burnGovernanceToken(uint256 amount) external onlyOwner {
        _burn(amount);
    }

    function transferVoteToken(uint256 amount) external {
        _transferVoteToken(amount);
    }

    /**
     * @dev See {ITreasury-getTokenBalance}.
     */
    function getTokenBalance() public view returns (uint256) {
        return IERC20(governanceToken).balanceOf(address(this));
    }

    /**
     * @dev See {ITreasury-getWinningToken}.
     */
    function getWinningToken(
        bytes32 proposalId,
        uint8 option
    ) public view returns (address) {
        return _proposalWinner[proposalId][option];
    }

    /**
     * @dev Transfers vote tokens from the sender to this contract.
     * @param amount The amount of tokens to transfer (before applying decimals).
     *
     * Requirements:
     * - The sender must have sufficient balance.
     * - The transfer must be approved.
     * - The amount must be greater than zero.
     *
     * Emits a {Transfer} event.
     */
    function _transferVoteToken(uint256 amount) internal {
        if (amount == 0) revert ApprovalFailed();
        uint256 amountToTransfer = amount * 10 ** _decimals;
        uint256 senderBalance = IERC20(governanceToken).balanceOf(msg.sender);

        if (senderBalance < amountToTransfer) revert InsufficientFunds();
        
        IERC20(governanceToken).safeTransferFrom(
            msg.sender,
            address(this),
            amountToTransfer
        );
    }

    /**
     * @dev Sets the winning token for a specific proposal and option.
     * @param proposalId The unique identifier of the proposal.
     * @param option The option number.
     * @param winningToken The address of the winning token.
     */
    function _setWinningToken(
        bytes32 proposalId,
        uint8 option,
        address winningToken
    ) internal {
        emit WinningTokenSet(proposalId, option, winningToken);
        _proposalWinner[proposalId][option] = winningToken;
    }

    /**
     * @dev Burns a specified amount of governance tokens from this contract.
     * @param amount The amount of tokens to burn (in token units, not wei).
     *
     * Requirements:
     * - The contract must have sufficient balance of governance tokens.
     *
     * Emits a {TokenBurned} event.
     */
    function _burn(uint256 amount) internal {
        uint256 amountToBurn = amount * (10 ** _decimals);
        uint256 governanceTokenBalance = IERC20(governanceToken).balanceOf(address(this));
        if (governanceTokenBalance < amountToBurn) revert InsufficientFunds();

        // Try to use the burn function if it exists
        try IERC20Burnable(governanceToken).burn(amountToBurn) {
            // Burning successful
        } catch {
            // If burn function doesn't exist or fails, transfer to zero address
            IERC20(governanceToken).transfer(address(0), amountToBurn);
        }

        emit TokenBurned(amountToBurn);
    }
}