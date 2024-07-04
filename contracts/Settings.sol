// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import { IDaoSettings } from "./interfaces/ISettings.sol";
import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @dev Extension of {Governor} for settings updatable through governance.
 */
contract DaoSettings is IDaoSettings, AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // amount of token
    uint256 private _proposalThreshold;
    // timepoint: limited to uint48 in core (same as clock() type)
    uint48 private _votingDelay;
    // duration: limited to uint32 in core
    uint32 private _votingPeriod;

    /**
     * @dev Initialize the governance parameters.
     */
    constructor(uint48 initialVotingDelay, uint32 initialVotingPeriod, uint256 initialProposalThreshold)
    {
        _setVotingDelay(initialVotingDelay);

        _setVotingPeriod(initialVotingPeriod);

        _setProposalThreshold(initialProposalThreshold);
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        _grantRole(ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Update the voting delay. This operation can only be performed by an admin.
     *
     * Emits a {VotingDelaySet} event.
     */
    function setVotingDelay(uint48 newVotingDelay) public onlyRole(ADMIN_ROLE) {
        _setVotingDelay(newVotingDelay);
    }

    /**
     * @dev Update the voting period. This operation can only be performed by an admin.
     *
     * Emits a {VotingPeriodSet} event.
     */
    function setVotingPeriod(uint32 newVotingPeriod) public onlyRole(ADMIN_ROLE) {
        _setVotingPeriod(newVotingPeriod);
    }

    /**
     * @dev Update the proposal threshold. This operation can only be performed by an admin.
     *
     * Emits a {ProposalThresholdSet} event.
     */
    function setProposalThreshold(uint256 newProposalThreshold) public onlyRole(ADMIN_ROLE) {
        _setProposalThreshold(newProposalThreshold);
    }

    /**
     * @dev See {IGovernor-votingDelay}.
     */
    function votingDelay() public view returns (uint256) {
        return _votingDelay;
    }

    /**
     * @dev See {IGovernor-votingPeriod}.
     */
    function votingPeriod() public view returns (uint256) {
        return _votingPeriod;
    }

    /**
     * @dev See {Governor-proposalThreshold}.
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