const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("YuanDao", function () {
  let yuanDao;
  let deployer;
  let user1;
  let user2;

  beforeEach(async () => {
    [deployer, user1, user2] = await ethers.getSigners();

    const YuanDao = await ethers.getContractFactory("YuanDao");
    yuanDao = await YuanDao.deploy("YuanDAO");
    await yuanDao.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct name", async function () {
      expect(await yuanDao.name()).to.equal("YuanDAO");
    });

    it("Should set the correct roles", async function () {
      expect(await yuanDao.hasRole(await yuanDao.DEFAULT_ADMIN_ROLE(), deployer.address)).to.be.true;
      expect(await yuanDao.hasRole(await yuanDao.PROPOSER_ROLE(), deployer.address)).to.be.true;
      expect(await yuanDao.hasRole(await yuanDao.EXECUTOR_ROLE(), deployer.address)).to.be.true;
    });
  });

  describe("Propose", function () {
    it("Should create a proposal", async function () {
      const targets = [ethers.ZeroAddress, ethers.ZeroAddress];
      const values = [0, 1];
      const description = "Test proposal";

      await expect(yuanDao.propose(targets, values, description))
        .to.emit(yuanDao, "ProposalCreated")
        .withArgs(
          1, // First proposal ID should be 1
          deployer.address,
          targets,
          values,
          await time.latest() + 7200,
          await time.latest() + 7200 + 50400,
          description
        );
    });

    it("Should create proposals with incremental IDs", async function () {
      const targets = [ethers.ZeroAddress];
      const values = [0];
      const description1 = "Test proposal 1";
      const description2 = "Test proposal 2";

      await yuanDao.propose(targets, values, description1);
      await yuanDao.propose(targets, values, description2);

      const state1 = await yuanDao.state(1);
      const state2 = await yuanDao.state(2);

      expect(state1).to.not.equal(5); // Not nonexistent
      expect(state2).to.not.equal(5); // Not nonexistent
    });

    it("Should revert if caller doesn't have PROPOSER_ROLE", async function () {
      const targets = [ethers.ZeroAddress, ethers.ZeroAddress];
      const values = [0, 1];
      const description = "Test proposal";

      await expect(yuanDao.connect(user1).propose(targets, values, description))
        .to.be.reverted
    });
  });

  describe("Cancel", function () {
    let proposalId;

    beforeEach(async function () {
      const targets = [ethers.ZeroAddress];
      const values = [0];
      const description = "Test proposal";

      await yuanDao.propose(targets, values, description);
      proposalId = 1; // First proposal ID
    });

    it("Should cancel a proposal", async function () {
      await expect(yuanDao.cancel(proposalId))
        .to.emit(yuanDao, "ProposalCanceled")
        .withArgs(proposalId);

      expect(await yuanDao.state(proposalId)).to.equal(2); // Canceled state
    });

    it("Should revert if caller is not user1 or admin", async function () {
      await expect(yuanDao.connect(user1).cancel(proposalId))
        .to.be.revertedWithCustomError(yuanDao, "GovernorUnauthorizedProposer")
        .withArgs(user1.address);
    });
  });

  describe("Voting", function () {
    let proposalId;

    beforeEach(async function () {
      const targets = [ethers.ZeroAddress, ethers.ZeroAddress];
      const values = [0, 1];
      const description = "Test proposal";

      await yuanDao.propose(targets, values, description);
      proposalId = 1; // First proposal ID

      await time.increase(7201); // Move past voting delay
    });

    it("Should cast a vote", async function () {
      const support = 0; // OptionA
      const weight = 100;

      await expect(yuanDao.castVote(proposalId, support, weight))
        .to.emit(yuanDao, "VoteCast")
        .withArgs(deployer.address, proposalId, support, weight, "");

      const { _optionAVotes, _optionBVotes, _totalVotes } = await yuanDao.getProposalVotes(proposalId);
      expect(_optionAVotes).to.equal(weight);
      expect(_optionBVotes).to.equal(0);
      expect(_totalVotes).to.equal(weight);
    });

    it("Should revert if voting on a non-active proposal", async function () {
      await time.increase(50401); // Move past voting period

      const support = 0; // OptionA
      const weight = 100;

      await expect(yuanDao.castVote(proposalId, support, weight))
        .to.be.revertedWithCustomError(yuanDao, "GovernorUnexpectedProposalState");
    });
  });

  describe("Proposal State", function () {
    let proposalId;

    beforeEach(async function () {
      const targets = [ethers.ZeroAddress, ethers.ZeroAddress];
      const values = [0, 1];
      const description = "Test proposal";

      await yuanDao.propose(targets, values, description);
      proposalId = 1; // First proposal ID
    });

    it("Should return Pending state", async function () {
      expect(await yuanDao.state(proposalId)).to.equal(0); // Pending state
    });

    it("Should return Active state", async function () {
      await time.increase(7201); // Move past voting delay
      expect(await yuanDao.state(proposalId)).to.equal(1); // Active state
    });

    it("Should return Canceled state", async function () {
      await yuanDao.cancel(proposalId);
      expect(await yuanDao.state(proposalId)).to.equal(2); // Canceled state
    });

    it("Should return Executed state", async function () {
      await time.increase(60401);
      await yuanDao.execute(proposalId);
      expect(await yuanDao.state(proposalId)).to.equal(3); // Canceled state
    });

  });

  describe("Execute", function () {
    let proposalId;

    beforeEach(async function () {
      // Create a proposal
      const tx = await yuanDao.propose(
        [ethers.ZeroAddress, ethers.ZeroAddress],
        [1, 2],
        "Test Proposal"
      );
      const receipt = await tx.wait();
      proposalId = 1;

      // Fast forward time to after voting period
      const votingPeriod = await yuanDao.votingPeriod();
      await ethers.provider.send("evm_increaseTime", [Number(votingPeriod) + 7201]);
      await ethers.provider.send("evm_mine");
    });

    it("should execute a proposal", async function () {
      await expect(yuanDao.execute(proposalId))
        .to.emit(yuanDao, "ProposalExecuted")
        .withArgs(proposalId);

      const { proposer, voteStart, voteDuration, executed, canceled } = await yuanDao.getProposalDetails(proposalId);
      expect(executed).to.be.true;
    });

    it("should revert if called by non-user1 and non-admin", async function () {
      await expect(yuanDao.connect(user2).execute(proposalId))
        .to.be.revertedWithCustomError(yuanDao, "GovernorUnauthorizedProposer");
    });

    it("should revert if proposal is already executed", async function () {
      await yuanDao.execute(proposalId);
      await expect(yuanDao.execute(proposalId))
        .to.be.revertedWithCustomError(yuanDao, "ProposalAlreadyExecutedOrCancelled");
    });

    it("should revert if proposal is cancelled", async function () {
      await yuanDao.cancel(proposalId);
      await expect(yuanDao.execute(proposalId))
        .to.be.revertedWithCustomError(yuanDao, "ProposalAlreadyExecutedOrCancelled");
    });

    it("should revert if proposal deadline is not reached", async function () {
      // Create a new proposal
      const tx = await yuanDao.propose(
        [ethers.ZeroAddress, ethers.ZeroAddress],
        [1, 2],
        "Another Test Proposal"
      );
      const receipt = await tx.wait();
      const newProposalId = 2;

      // Try to execute immediately
      await expect(yuanDao.execute(newProposalId))
        .to.be.revertedWithCustomError(yuanDao, "ProposalDeadlineNotReached");
    });
  });
});