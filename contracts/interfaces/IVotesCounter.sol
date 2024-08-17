// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

/**
 * @dev Interface for the VotesCounter smart contract.
 */
interface IVotesCounter {
    /**
     * @dev The vote type used is not valid for the corresponding counting module.
     */
    error GovernorInvalidVoteType();

    /**
     * @dev Returns the vote counts for a given proposal.
     * @param proposalId The ID of the proposal.
     * @return againstVotes The total number of votes against the proposal.
     * @return forVotes The total number of votes for the proposal.
     * @return totalVotes The combined votes of against and for votes.
     */
    function getProposalVotes(
        uint256 proposalId
    )
        external
        view
        returns (uint256 againstVotes, uint256 forVotes, uint256 totalVotes);
}
