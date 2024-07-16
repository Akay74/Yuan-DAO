// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

interface ITreasury {

    /**
     * @dev Emitted when a new winning token is set.
     * @param proposalId The id of the proposal that the winning token is being set
     * @param option The option number of the winning token in the proposal
     * @param winningToken The address of the proposal winning token.
     */
    event WinningTokenSet(bytes32 proposalId, uint8 option, address winningToken);

    event TokenBurned(uint256 amount);

    /**
     * @dev Sets the address of the winning token that will be distributed to voters.
     *      This function can only be called by the contract owner.
     * @param proposalId The id of the proposal that the winning token is being sent
     * @param option The option number of the winning token in the proposal
     * @param winningToken The address of the winning token.
     */
    function setWinningToken(bytes32 proposalId, uint8 option, address winningToken) external;

    function burnGovernanceToken(uint256 amount) external;

    function transferVoteToken(uint256 amount) external;

    /**
     * @dev Returns the current balance of the winning token held by the contract.
     * @return The balance of the winning token.
     */
    function getTokenBalance() external view returns (uint256);

    /**
     * @dev Returns the address of the currently set winning token.
     * @return The address of the winning token.
     * @param proposalId The id of the proposal that the winning token is being sent
     * @param option The option number of the winning token in the proposal
     */
    function getWinningToken(bytes32 proposalId, uint8 option) external view returns (address);
}
