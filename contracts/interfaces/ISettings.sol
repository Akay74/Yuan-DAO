// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

/**
 * @dev Interface for the DAO Settings contract.
 */
interface IDaoSettings {
  /**
   * @dev Emitted when the voting delay is updated.
   * @param oldVotingDelay The old voting delay value.
   * @param newVotingDelay The new voting delay value.
   */
  event VotingDelaySet(uint256 oldVotingDelay, uint256 newVotingDelay);

  /**
   * @dev Emitted when the voting period is updated.
   * @param oldVotingPeriod The old voting period value.
   * @param newVotingPeriod The new voting period value.
   */
  event VotingPeriodSet(uint256 oldVotingPeriod, uint256 newVotingPeriod);

  /**
   * @dev Emitted when the proposal threshold is updated.
   * @param oldProposalThreshold The old proposal threshold value.
   * @param newProposalThreshold The new proposal threshold value.
   */
  event ProposalThresholdSet(uint256 oldProposalThreshold, uint256 newProposalThreshold);

  /**
   * @dev The voting period set is not a valid period.
   */
  error GovernorInvalidVotingPeriod(uint256 votingPeriod);

  /**
    * @dev Update the voting delay. This operation can only be performed by an admin.
    * @param newVotingDelay the voting delay to set
    * Emits a {VotingDelaySet} event.
    */
  function setVotingDelay(uint48 newVotingDelay) external;

  /**
    * @dev Update the voting period. This operation can only be performed by an admin.
    * @param newVotingPeriod the voting period to set
    * Emits a {VotingPeriodSet} event.
    */
  function setVotingPeriod(uint32 newVotingPeriod) external;

  /**
    * @dev Update the proposal threshold. This operation can only be performed by an admin.
    * @param newProposalThreshold the new threshold to set
    * Emits a {ProposalThresholdSet} event.
    */
  function setProposalThreshold(uint256 newProposalThreshold) external;

  /**
   * @dev Returns the current voting delay.
   * @return The voting delay in seconds.
   */
  function votingDelay() external view returns (uint256);

  /**
   * @dev Returns the current voting period.
   * @return The voting period in seconds.
   */
  function votingPeriod() external view returns (uint256);

  /**
   * @dev Returns the current proposal threshold.
   * @return The amount of tokens required to submit a proposal.
   */
  function proposalThreshold() external view returns (uint256);
}
