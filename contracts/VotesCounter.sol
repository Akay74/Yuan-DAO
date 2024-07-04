// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import { IVotesCounter } from "./interfaces/IVotesCounter.sol";

contract VotesCounter is IVotesCounter {
    /**
     * @dev Supported vote types. Matches Governor Bravo ordering.
     */
    enum VoteType {
        OptionA,
        OptionB
    }

    struct ProposalVote {
        uint256 optionAVotes;
        uint256 optionBVotes;
        mapping(address => uint256) votesPerVoter;
    }

    mapping(uint256 => ProposalVote) public proposalVotes;

    /**
     * @dev Accessor to the internal vote counts.
     */
    function getProposalVotes(
        uint256 proposalId
    ) public view returns (uint256 _optionAVotes, uint256 _optionBVotes, uint256 _totalVotes) {
        ProposalVote storage proposalVote = proposalVotes[proposalId];

        _totalVotes = proposalVote.optionAVotes + proposalVote.optionBVotes;
        return (proposalVote.optionAVotes, proposalVote.optionBVotes, _totalVotes);
    }

    /**
     * @dev See {Governor-_countVote}. In this module, the support follows the `VoteType` enum (from Governor Bravo).
     */
    function _countVote(
        uint256 proposalId,
        address account,
        uint8 support,
        uint256 weight
    ) internal {
        ProposalVote storage proposalVote = proposalVotes[proposalId];

        proposalVote.votesPerVoter[account] += weight;

        if (support == uint8(VoteType.OptionA)) {
            proposalVote.optionAVotes += weight;
        } else if (support == uint8(VoteType.OptionB)) {
            proposalVote.optionBVotes += weight;
        } else {
            revert GovernorInvalidVoteType();
        }
    }

    /**
     * @dev See {Governor-_voteSucceeded}. In this module, the optionBVotes must be strictly over the optionAVotes.
     */
    function _voteFinalized(uint256 proposalId) internal view returns (uint256) {
        ProposalVote storage proposalVote = proposalVotes[proposalId];

        uint256 totalVotes = proposalVote.optionBVotes + proposalVote.optionAVotes;
        return totalVotes;
    }
} 