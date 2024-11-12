const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("YuanDao Voting", function () {
  let yuanDao;
  let owner, voter1, voter2, voter3;
  const proposalId = 1;
  const daoName = "Test DAO";

  beforeEach(async function () {
    [owner, voter1, voter2, voter3] = await ethers.getSigners();

    // Deploy YuanDao
    const YuanDao = await ethers.getContractFactory("YuanDao");
    yuanDao = await YuanDao.deploy(daoName);
    await yuanDao.waitForDeployment();

    // Create a proposal
    const targets = [ethers.ZeroAddress];
    const values = [0];
    await yuanDao.propose(targets, values, "Test Proposal");

    // Grant voter roles to test accounts
    const proposerRole = await yuanDao.PROPOSER_ROLE();
    await yuanDao.grantRole(proposerRole, voter1.address);
    await yuanDao.grantRole(proposerRole, voter2.address);
    await yuanDao.grantRole(proposerRole, voter3.address);

    // Fast forward past voting delay to make proposal active
    const votingDelay = await yuanDao.votingDelay();
    await ethers.provider.send("evm_increaseTime", [Number(votingDelay) + 1]);
    await ethers.provider.send("evm_mine");
  });

  describe("Proposal Voting", function () {
    it("Should return zero votes for a new proposal", async function () {
      const [optionAVotes, optionBVotes, totalVotes] = await yuanDao.getProposalVotes(proposalId);
      
      expect(optionAVotes).to.equal(0);
      expect(optionBVotes).to.equal(0);
      expect(totalVotes).to.equal(0);
    });

    it("Should return correct votes after multiple votes are cast", async function () {
      await yuanDao.connect(voter1).castVote(proposalId, 0, 100); // OptionA
      await yuanDao.connect(voter2).castVote(proposalId, 1, 150); // OptionB
      await yuanDao.connect(voter3).castVote(proposalId, 0, 50);  // OptionA

      const [optionAVotes, optionBVotes, totalVotes] = await yuanDao.getProposalVotes(proposalId);
      
      expect(optionAVotes).to.equal(150); // 100 + 50
      expect(optionBVotes).to.equal(150);
      expect(totalVotes).to.equal(300); // 150 + 150
    });

    it("Should correctly count OptionA votes", async function () {
      await yuanDao.connect(voter1).castVote(proposalId, 0, 100);
      
      const [optionAVotes, optionBVotes, totalVotes] = await yuanDao.getProposalVotes(proposalId);
      expect(optionAVotes).to.equal(100);
      expect(optionBVotes).to.equal(0);
      expect(totalVotes).to.equal(100);
    });

    it("Should correctly count OptionB votes", async function () {
      await yuanDao.connect(voter1).castVote(proposalId, 1, 100);
      
      const [optionAVotes, optionBVotes, totalVotes] = await yuanDao.getProposalVotes(proposalId);
      expect(optionAVotes).to.equal(0);
      expect(optionBVotes).to.equal(100);
      expect(totalVotes).to.equal(100);
    });

    it("Should accumulate votes from the same voter", async function () {
      await yuanDao.connect(voter1).castVote(proposalId, 0, 100);
      await yuanDao.connect(voter1).castVote(proposalId, 0, 50);
      
      const [optionAVotes, optionBVotes, totalVotes] = await yuanDao.getProposalVotes(proposalId);
      expect(optionAVotes).to.equal(150);
      expect(optionBVotes).to.equal(0);
      expect(totalVotes).to.equal(150);
    });

    it("Should revert with invalid vote type", async function () {
      await expect(
        yuanDao.connect(voter1).castVote(proposalId, 2, 100)
      ).to.be.revertedWithCustomError(yuanDao, "GovernorInvalidVoteType");
    });

    it("Should only allow voting during the voting period", async function () {
      // Fast forward past voting period
      const votingPeriod = await yuanDao.votingPeriod();
      await ethers.provider.send("evm_increaseTime", [Number(votingPeriod) + 1]);
      await ethers.provider.send("evm_mine");

      await expect(
        yuanDao.connect(voter1).castVote(proposalId, 0, 100)
      ).to.be.revertedWithCustomError(
        yuanDao,
        "GovernorUnexpectedProposalState"
      );
    });
  });

  describe("Get Total Votes", function () {
    it("Should return zero total votes for a new proposal", async function () {
      const totalVotes = await yuanDao.getTotalVotes(proposalId);
      expect(totalVotes).to.equal(0);
    });

    it("Should return correct total votes after multiple voters cast votes", async function () {
      await yuanDao.connect(voter1).castVote(proposalId, 0, 100);
      await yuanDao.connect(voter2).castVote(proposalId, 1, 150);
      await yuanDao.connect(voter3).castVote(proposalId, 0, 50);

      const totalVotes = await yuanDao.getTotalVotes(proposalId);
      expect(totalVotes).to.equal(300);
    });

    it("Should return zero for a non-existent proposal", async function () {
      const nonExistentProposalId = 999;
      const totalVotes = await yuanDao.getTotalVotes(nonExistentProposalId);
      expect(totalVotes).to.equal(0);
    });

    it("Should return correct total when votes are updated", async function () {
      // Initial vote
      await yuanDao.connect(voter1).castVote(proposalId, 0, 100);
      let totalVotes = await yuanDao.getTotalVotes(proposalId);
      expect(totalVotes).to.equal(100);

      // Update vote
      await yuanDao.connect(voter1).castVote(proposalId, 0, 150);
      totalVotes = await yuanDao.getTotalVotes(proposalId);
      expect(totalVotes).to.equal(250);
    });

    it("Should track total votes across different vote types", async function () {
      await yuanDao.connect(voter1).castVote(proposalId, 0, 100); // Option A
      await yuanDao.connect(voter2).castVote(proposalId, 1, 150); // Option B
      
      const totalVotes = await yuanDao.getTotalVotes(proposalId);
      expect(totalVotes).to.equal(250);
    });

    it("Should maintain correct total votes after voting period ends", async function () {
      // Cast votes
      await yuanDao.connect(voter1).castVote(proposalId, 0, 100);
      await yuanDao.connect(voter2).castVote(proposalId, 1, 150);

      // Fast forward past voting period
      const votingPeriod = await yuanDao.votingPeriod();
      await ethers.provider.send("evm_increaseTime", [Number(votingPeriod) + 1]);
      await ethers.provider.send("evm_mine");

      const totalVotes = await yuanDao.getTotalVotes(proposalId);
      expect(totalVotes).to.equal(250);
    });
  });

  describe("Integration with Proposal Lifecycle", function () {
    it("Should handle complete proposal lifecycle with voting", async function () {
      // Multiple voters cast votes during active period
      await yuanDao.connect(voter1).castVote(proposalId, 0, 100);
      await yuanDao.connect(voter2).castVote(proposalId, 1, 150);
      await yuanDao.connect(voter3).castVote(proposalId, 0, 50);

      // Check vote counts during active period
      const [optionAVotes, optionBVotes, totalVotes] = await yuanDao.getProposalVotes(proposalId);
      expect(optionAVotes).to.equal(150);
      expect(optionBVotes).to.equal(150);
      expect(totalVotes).to.equal(300);

      // Fast forward to end of voting period
      const votingPeriod = await yuanDao.votingPeriod();
      await ethers.provider.send("evm_increaseTime", [Number(votingPeriod) + 1]);
      await ethers.provider.send("evm_mine");

      // Execute the proposal
      await yuanDao.execute(proposalId);

      // Verify proposal state
      const finalState = await yuanDao.state(proposalId);
      expect(finalState).to.equal(3); // Executed state

      // Verify that voting is no longer possible
      await expect(
        yuanDao.connect(voter1).castVote(proposalId, 0, 100)
      ).to.be.revertedWithCustomError(
        yuanDao,
        "GovernorUnexpectedProposalState"
      );
    });
  });
});