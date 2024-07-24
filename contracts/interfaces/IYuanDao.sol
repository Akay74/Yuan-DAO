// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

/**
 * @title IYuanDao
 * @dev Interface of the Yuan DAO.
 */
interface IYuanDao {
    /**
     * @dev Enum representing the state of a proposal
     */
    enum ProposalState {
        Pending,
        Active,
        Canceled,
        Executed
    }

    /**
     * @dev Emitted when a proposal is created.
     * @param proposalId Unique identifier of the proposal
     * @param proposer Address of the account that created the proposal
     * @param targets Array of addresses that the proposal calls
     * @param values Array of eth values to be sent with the calls
     * @param voteStart The start time of the voting period
     * @param voteEnd The end time of the voting period
     * @param description String description of the proposal
     */
    event ProposalCreated(
        uint256 proposalId,
        address proposer,
        address[] targets,
        uint256[] values,
        uint256 voteStart,
        uint256 voteEnd,
        string description
    );

    /**
     * @dev Emitted when a proposal is executed.
     * @param proposalId Unique identifier of the executed proposal
     */
    event ProposalExecuted(uint256 proposalId);

    /**
     * @dev Emitted when a proposal is canceled.
     * @param proposalId Unique identifier of the canceled proposal
     */
    event ProposalCanceled(uint256 proposalId);

    /**
     * @dev Emitted when a vote is cast without params.
     * @param voter Address of the account casting the vote
     * @param proposalId Unique identifier of the proposal
     * @param support The type of vote (for, against, abstain)
     * @param weight The weight of the vote
     * @param reason A string explaining the reason for the vote
     * @notice `support` values should be seen as buckets. Their interpretation depends on the voting module used.
     */
    event VoteCast(address indexed voter, uint256 proposalId, uint8 support, uint256 weight, string reason);

    /**
     * @dev Empty proposal or a mismatch between the parameters length for a proposal call.
     * @param targets Number of target addresses
     * @param values Number of eth values
     */
    error GovernorInvalidProposalLength(uint256 targets, uint256 values);

    /**
     * @dev The vote was already cast.
     * @param voter Address of the voter who already cast their vote
     */
    error GovernorAlreadyCastVote(address voter);

    /**
     * @dev Token deposits are disabled in this contract.
     */
    error GovernorDisabledDeposit();

    /**
     * @dev The `account` is not a proposer.
     * @param account Address of the account trying to perform a proposer-only action
     */
    error GovernorOnlyProposer(address account);

    /**
     * @dev The `proposalId` doesn't exist.
     * @param proposalId Unique identifier of the non-existent proposal
     */
    error GovernorNonexistentProposal(uint256 proposalId);
    
    /**
     * @dev The proposer does not have rights to the method.
     * @param sender Address of the unauthorized sender
     */
    error GovernorUnauthorizedProposer(address sender);

    /**
     * @dev The current state of a proposal is not the required for performing an operation.
     * @param proposalId Unique identifier of the proposal
     * @param current Current state of the proposal
     * @param expectedStates Bitmap of expected states
     * @notice The `expectedStates` is a bitmap with the bits enabled for each ProposalState enum position
     * counting from right to left.
     * @notice If `expectedState` is `bytes32(0)`, the proposal is expected to not be in any state (i.e. not exist).
     * This is the case when a proposal that is expected to be unset is already initiated (the proposal is duplicated).
     * @notice See {Governor-_encodeStateBitmap}.
     */
    error GovernorUnexpectedProposalState(uint256 proposalId, ProposalState current, bytes32 expectedStates);

    /**
     * @dev The `proposer` is not allowed to create a proposal.
     * @param proposer Address of the restricted proposer
     */
    error GovernorRestrictedProposer(address proposer);

    /**
     * @dev The provided signature is not valid for the expected `voter`.
     * @param voter Address of the voter with an invalid signature
     * @notice If the `voter` is a contract, the signature is not valid using {IERC1271-isValidSignature}.
     */
    error GovernorInvalidSignature(address voter);

    /**
     * @dev Create a new proposal.
     * @param targets Array of addresses that the proposal calls
     * @param values Array of eth values to be sent with the calls
     * @param description String description of the proposal
     * @return proposalId Unique identifier of the created proposal
     * @notice Vote starts after a delay specified by {IGovernor-votingDelay} and lasts for a
     * duration specified by {IGovernor-votingPeriod}.
     * @notice Emits a {ProposalCreated} event.
     */
    function propose(
        address[] memory targets,
        uint256[] memory values,
        string memory description
    ) external returns (uint256 proposalId);

    /**
     * @dev Cancel a proposal.
     * @param proposalId Unique identifier of the canceled proposal
     * @return Unique identifier of the canceled proposal
     * @notice A proposal is cancellable by the proposer, but only while it is Pending state, i.e.
     * before the vote starts.
     * @notice Emits a {ProposalCanceled} event.
     */
    function cancel(uint256 proposalId) external returns (uint256);

    /**
     * @dev Cast a vote
     * @param proposalId Unique identifier of the proposal
     * @param support The type of vote (for, against, abstain)
     * @param weight The weight of the vote
     * @return balance The updated balance after casting the vote
     * @notice Emits a {VoteCast} event.
     */
    function castVote(uint256 proposalId, uint8 support, uint256 weight) external returns (uint256 balance);

    /**
     * @dev Name of the governor instance (used in building the ERC712 domain separator).
     * @return string The name of the governor
     */
    function name() external view returns (string memory);

    /**
     * @dev Current state of a proposal, following Compound's convention
     * @param proposalId Unique identifier of the proposal
     * @return ProposalState The current state of the proposal
     */
    function state(uint256 proposalId) external view returns (ProposalState);

    /**
     * @dev Timepoint used to retrieve user's votes and quorum.
     * @param proposalId Unique identifier of the proposal
     * @return uint256 The timepoint (block number) at which the proposal starts
     * @notice If using block number (as per Compound's Comp), the snapshot is performed at the end of this block. 
     * Hence, voting for this proposal starts at the beginning of the following block.
     */
    function proposalStart(uint256 proposalId) external view returns (uint256);

    /**
     * @dev Timepoint at which votes close.
     * @param proposalId Unique identifier of the proposal
     * @return uint256 The timepoint (block number) at which the proposal ends
     * @notice If using block number, votes close at the end of this block, so it is possible to cast a vote during this block.
     */
    function proposalDeadline(uint256 proposalId) external view returns (uint256);

    /**
     * @dev The account that created a proposal.
     * @param proposalId Unique identifier of the proposal
     * @return address The address of the proposer
     */
    function proposalProposer(uint256 proposalId) external view returns (address);
}