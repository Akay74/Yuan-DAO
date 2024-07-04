// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import { IYuanDao } from "./interfaces/IYuanDao.sol";
import { DaoSettings } from "./Settings.sol";
import { VotesCounter } from "./VotesCounter.sol";
import { SafeCast } from "@openzeppelin/contracts/utils/math/SafeCast.sol";

contract YuanDao is IYuanDao, DaoSettings, VotesCounter {

    struct ProposalCore {
        address proposer;
        uint48 voteStart;
        uint32 voteDuration;
        bool executed;
        bool canceled;
    }

    mapping(uint256 => ProposalCore) private _proposals;

    bytes32 private constant _ALL_PROPOSAL_STATES_BITMAP = bytes32((2 ** (uint8(type(ProposalState).max) + 1)) - 1);
    string private _name;

    bytes32 public constant PROPOSER_ROLE = keccak256("PROPOSER_ROLE");
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");

    /**
     * @dev Sets the value for {name} and sets up initial roles
     */
    constructor(string memory name_)
        DaoSettings(7200, 50400, 0)
    {
        _name = name_;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        _grantRole(PROPOSER_ROLE, msg.sender);

        _grantRole(EXECUTOR_ROLE, msg.sender);
    }

    // receive() external payable {}

    /**
     * @dev See {IYuanDao-hashProposal}.
     *
     * The proposal id is produced by hashing the ABI encoded `targets` array, the `values` array, the `calldatas` array
     * and the descriptionHash (bytes32 which itself is the keccak256 hash of the description string). This proposal id
     * can be produced from the proposal data which is part of the {ProposalCreated} event. It can even be computed in
     * advance, before the proposal is submitted.
     *
     * Note that the chainId and the governor address are not part of the proposal id computation. Consequently, the
     * same proposal (with same operation and same description) will have the same id if submitted on multiple governors
     * across multiple networks. This also means that in order to execute the same operation twice (on the same
     * governor) the proposer will have to change the description in order to avoid proposal id conflicts.
     */
    function hashProposal(
        address[] memory targets,
        uint256[] memory values,
        bytes32 descriptionHash
    ) public returns (uint256) {
        return uint256(keccak256(abi.encode(targets, values, descriptionHash)));
    }
    
    /**
     * @dev Register a vote for `proposalId` by `account` with a given `support`, voting `weight` and voting `params`.
     *
     * Note: Support is generic and can represent various things depending on the voting system used.
     */
    function countVote(
        uint256 proposalId,
        address account,
        uint8 support,
        uint256 weight
    ) public {
        _countVote(proposalId, account, support, weight);
    }

    /**
     * @dev See {IYuanDao-propose}
     */
    function propose(
        address[] memory targets,
        uint256[] memory values,
        string memory description
    ) public onlyRole(PROPOSER_ROLE) returns (uint256) {
        address proposer = _msgSender();

        return _propose(targets, values, description, proposer);
    }

     /**
     * @dev See {IYuanDao-cancel}.
     */
    function cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes32 descriptionHash
    ) public returns (uint256) {
        uint256 proposalId = hashProposal(targets, values, descriptionHash);

        _validateStateBitmap(proposalId, _encodeStateBitmap(ProposalState.Pending));
        if (_msgSender() != proposalProposer(proposalId) && !hasRole(ADMIN_ROLE, _msgSender())) {
            revert GovernorUnauthorizedProposer(_msgSender());
        }

        return _cancel(targets, values, descriptionHash);
    }

    /**
     * @dev See {IYuanDao-castVote}.
     */
    function castVote(uint256 proposalId, uint8 support, uint256 weight) public returns (uint256) {
        address voter = _msgSender();
        return _castVote(proposalId, voter, support, weight, "");
    }

    /**
     * @dev See {IYuanDao-name}.
     */
    function name() public view returns (string memory) {
        return _name;
    }

    /**
     * @dev See {IYuanDao-state}.
     */
    function state(uint256 proposalId) public view returns (ProposalState) {
        // We read the struct fields into the stack at once so Solidity emits a single SLOAD
        ProposalCore storage proposal = _proposals[proposalId];
        bool proposalExecuted = proposal.executed;
        bool proposalCanceled = proposal.canceled;

        if (proposalExecuted) {
            return ProposalState.Executed;
        }

        if (proposalCanceled) {
            return ProposalState.Canceled;
        }

        uint256 snapshot = proposalStart(proposalId);

        if (snapshot == 0) {
            revert GovernorNonexistentProposal(proposalId);
        }

        uint256 currentTimepoint = block.timestamp;

        if (snapshot >= currentTimepoint) {
            return ProposalState.Pending;
        }

        uint256 deadline = proposalDeadline(proposalId);

        if (deadline >= currentTimepoint) {
            return ProposalState.Active;
        } 
    }

    /**
     * @dev See {IYuanDao-proposalStart}.
     */
    function proposalStart(uint256 proposalId) public view returns (uint256) {
        return _proposals[proposalId].voteStart;
    }

    /**
     * @dev See {IYuanDao-proposalDeadline}.
     */
    function proposalDeadline(uint256 proposalId) public view returns (uint256) {
        return _proposals[proposalId].voteStart + _proposals[proposalId].voteDuration;
    }

    /**
     * @dev See {IYuanDao-proposalProposer}.
     */
    function proposalProposer(uint256 proposalId) public view returns (address) {
        return _proposals[proposalId].proposer;
    }

    /**
     * @dev Internal cancel mechanism with minimal restrictions. A proposal can be cancelled in any state other than
     * Canceled, Expired, or Executed. Once cancelled a proposal can't be re-submitted.
     *
     * Emits a {IYuanDao-ProposalCanceled} event.
     */
    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes32 descriptionHash
    ) internal returns (uint256) {
        uint256 proposalId = hashProposal(targets, values, descriptionHash);

        _validateStateBitmap(
            proposalId,
            _ALL_PROPOSAL_STATES_BITMAP ^
                _encodeStateBitmap(ProposalState.Canceled) ^
                _encodeStateBitmap(ProposalState.Executed)
        );

        _proposals[proposalId].canceled = true;
        emit ProposalCanceled(proposalId);

        return proposalId;
    }
    
    /**
     * @dev Internal propose mechanism. Can be overridden to add more logic on proposal creation.
     *
     * Emits a {IYuanDao-ProposalCreated} event.
     */
    function _propose(
        address[] memory targets,
        uint256[] memory values,
        string memory description,
        address proposer
    ) internal returns (uint256 proposalId) {
        proposalId = hashProposal(targets, values, keccak256(bytes(description)));

        if (targets.length != values.length || targets.length == 0) {
            revert GovernorInvalidProposalLength(targets.length, values.length);
        }
        if (_proposals[proposalId].voteStart != 0) {
            revert GovernorUnexpectedProposalState(proposalId, state(proposalId), bytes32(0));
        }

        uint256 snapshot = block.timestamp + votingDelay();
        uint256 duration = votingPeriod();

        ProposalCore storage proposal = _proposals[proposalId];
        proposal.proposer = proposer;
        proposal.voteStart = SafeCast.toUint48(snapshot);
        proposal.voteDuration = SafeCast.toUint32(duration);

        emit ProposalCreated(
            proposalId,
            proposer,
            targets,
            values,
            snapshot,
            snapshot + duration,
            description
        );

        return proposalId;
    }

    /**
     * @dev Internal vote casting mechanism: Check that the vote is pending, that it has not been cast yet, retrieve
     * voting weight using {IYuanDao-getVotes} and call the {_countVote} internal function.
     *
     * Emits a {IYuanDao-VoteCast} event.
     */
    function _castVote(
        uint256 proposalId,
        address account,
        uint8 support,
        uint256 weight,
        string memory reason
    ) internal returns (uint256) {
        _validateStateBitmap(proposalId, _encodeStateBitmap(ProposalState.Active));

        _countVote(proposalId, account, support, weight);

        emit VoteCast(account, proposalId, support, weight, reason);

        return weight;
    }

    /**
     * @dev Encodes a `ProposalState` into a `bytes32` representation where each bit enabled corresponds to
     * the underlying position in the `ProposalState` enum. For example:
     *
     * 0x000...10000
     *   ^^^^^^------ ...
     *         ^----- Succeeded
     *          ^---- Defeated
     *           ^--- Canceled
     *            ^-- Active
     *             ^- Pending
     */
    function _encodeStateBitmap(ProposalState proposalState) internal pure returns (bytes32) {
        return bytes32(1 << uint8(proposalState));
    }

    /**
     * @dev Check that the current state of a proposal matches the requirements described by the `allowedStates` bitmap.
     * This bitmap should be built using `_encodeStateBitmap`.
     *
     * If requirements are not met, reverts with a {GovernorUnexpectedProposalState} error.
     */
    function _validateStateBitmap(uint256 proposalId, bytes32 allowedStates) private view returns (ProposalState) {
        ProposalState currentState = state(proposalId);
        if (_encodeStateBitmap(currentState) & allowedStates == bytes32(0)) {
            revert GovernorUnexpectedProposalState(proposalId, currentState, allowedStates);
        }
        return currentState;
    }
}