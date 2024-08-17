// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import { IDaoSettings } from "./interfaces/ISettings.sol";
import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @dev Contract for settings updatable through governance.
 */
contract DaoSettings is IDaoSettings, AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // amount of token
    uint256 private _proposalThreshold;
    // timepoint
    uint48 private _votingDelay;
    // duration
    uint32 private _votingPeriod;

    /**
     * @dev Initialize the governance settings parameters.
     */
    constructor(
        uint48 initialVotingDelay,
        uint32 initialVotingPeriod,
        uint256 initialProposalThreshold
    ) {
        _setVotingDelay(initialVotingDelay);

        _setVotingPeriod(initialVotingPeriod);

        _setProposalThreshold(initialProposalThreshold);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        _grantRole(ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev See {IDaoSettings-setVotingDelay}.
     */
    function setVotingDelay(uint48 newVotingDelay) public onlyRole(ADMIN_ROLE) {
        _setVotingDelay(newVotingDelay);
    }

    /**
     * @dev See {IDaoSettings-setVotingPeriod}.
     */
    function setVotingPeriod(
        uint32 newVotingPeriod
    ) public onlyRole(ADMIN_ROLE) {
        _setVotingPeriod(newVotingPeriod);
    }

    /**
     * @dev See {IDaoSettings-setProposalThreshold}.
     */
    function setProposalThreshold(
        uint256 newProposalThreshold
    ) public onlyRole(ADMIN_ROLE) {
        _setProposalThreshold(newProposalThreshold);
    }

    /**
     * @dev See {IDaoSettings-votingDelay}.
     */
    function votingDelay() public view returns (uint256) {
        return _votingDelay;
    }

    /**
     * @dev See {IDaoSettings-votingPeriod}.
     */
    function votingPeriod() public view returns (uint256) {
        return _votingPeriod;
    }

    /**
     * @dev See {IDaoSettings-proposalThreshold}.
     */
    function proposalThreshold() public view returns (uint256) {
        return _proposalThreshold;
    }

    /**
     * @dev Internal setter for the voting delay.
     *
     * Emits a {VotingDelaySet} event.
     */
    function _setVotingDelay(uint48 newVotingDelay) internal {
        emit VotingDelaySet(_votingDelay, newVotingDelay);
        _votingDelay = newVotingDelay;
    }

    /**
     * @dev Internal setter for the voting period.
     *
     * Emits a {VotingPeriodSet} event.
     */
    function _setVotingPeriod(uint32 newVotingPeriod) internal {
        if (newVotingPeriod == 0) {
            revert GovernorInvalidVotingPeriod(0);
        }
        emit VotingPeriodSet(_votingPeriod, newVotingPeriod);
        _votingPeriod = newVotingPeriod;
    }

    /**
     * @dev Internal setter for the proposal threshold.
     *
     * Emits a {ProposalThresholdSet} event.
     */
    function _setProposalThreshold(uint256 newProposalThreshold) internal {
        emit ProposalThresholdSet(_proposalThreshold, newProposalThreshold);
        _proposalThreshold = newProposalThreshold;
    }
}
