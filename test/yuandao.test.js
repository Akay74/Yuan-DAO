const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("YuanDao", function () {
  let yuanDao;
  let deployer;
  let user1;
  let user2;

  beforeEach(async () => {
    [deployer, user1, user2] = await ethers.getSigners();

    const YuanDao = await ethers.getContractFactory("YuanDao");
    yuanDao = await YuanDao.deploy("TestDAO");
    await yuanDao.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct name", async function () {
      expect(await yuanDao.name()).to.equal("TestDAO");
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
      const values = [0, 1 ];
      const description = "Test proposal";

      await expect(yuanDao.propose(targets, values, description))
        .to.emit(yuanDao, "ProposalCreated")
        .withArgs(
          await yuanDao.hashProposal(targets, values, ethers.id(description)),
          deployer.address,
          targets,
          values,
          await time.latest() + 7200,
          await time.latest() + 7200 + 50400,
          description
        );
    });

    it("Should revert if caller doesn't have PROPOSER_ROLE", async function () {
      const targets = [ethers.ZeroAddress, ethers.ZeroAddress];
      const values = [0, 1];
      const description = "Test proposal";

      await expect(yuanDao.connect(user1).propose(targets, values, description))
        .to.be.revertedWithCustomError(yuanDao, "AccessControlUnauthorizedAccount")
        .withArgs(user1.address, await yuanDao.PROPOSER_ROLE());
    });
  });

  describe("Cancel", function () {
    let proposalId;

    beforeEach(async function () {
      const targets = [ethers.ZeroAddress];
      const values = [0];
      const description = "Test proposal";

      await yuanDao.propose(targets, values, description);
      proposalId = await yuanDao.hashProposal(targets, values, ethers.id(description));
    });

    it("Should cancel a proposal", async function () {
      const targets = [ethers.ZeroAddress];
      const values = [0];
      const descriptionHash = ethers.id("Test proposal");

      await expect(yuanDao.cancel(targets, values, descriptionHash))
        .to.emit(yuanDao, "ProposalCanceled")
        .withArgs(proposalId);

      expect(await yuanDao.state(proposalId)).to.equal(2); // Canceled state
    });

    it("Should revert if caller is not proposer or admin", async function () {
      const targets = [ethers.ZeroAddress];
      const values = [0];
      const descriptionHash = ethers.id("Test proposal");

      await expect(yuanDao.connect(user1).cancel(targets, values, descriptionHash))
        .to.be.revertedWithCustomError(yuanDao, "GovernorUnauthorizedProposer")
        .withArgs(user1.address);
    });
  });

  describe("Voting", function () {
    let proposalId;

    beforeEach(async function () {
      const targets = [ethers.ZeroAddress];
      const values = [0];
      const description = "Test proposal";

      await yuanDao.propose(targets, values, description);
      proposalId = await yuanDao.hashProposal(targets, values, ethers.id(description));

      await time.increase(7201); // Move past voting delay
    });

    it("Should cast a vote", async function () {
      const support = 1; // For
      const weight = 100;

      await expect(yuanDao.castVote(proposalId, support, weight))
        .to.emit(yuanDao, "VoteCast")
        .withArgs(deployer.address, proposalId, support, weight, "");

      const { forVotes } = await yuanDao.proposalVotes(proposalId);
      expect(forVotes).to.equal(weight);
    });

    it("Should revert if voting on a non-active proposal", async function () {
      await time.increase(50401); // Move past voting period

      const support = 1; // For
      const weight = 100;

      await expect(yuanDao.castVote(proposalId, support, weight))
        .to.be.revertedWithCustomError(yuanDao, "GovernorUnexpectedProposalState");
    });
  });

  describe("Proposal State", function () {
    let proposalId;

    beforeEach(async function () {
      const targets = [ethers.ZeroAddress];
      const values = [0];
      const description = "Test proposal";

      await yuanDao.propose(targets, values, description);
      proposalId = await yuanDao.hashProposal(targets, values, ethers.id(description));
    });

    it("Should return Pending state", async function () {
      expect(await yuanDao.state(proposalId)).to.equal(0); // Pending state
    });

    it("Should return Active state", async function () {
      await time.increase(7201); // Move past voting delay
      expect(await yuanDao.state(proposalId)).to.equal(1); // Active state
    });

    it("Should return Canceled state", async function () {
      const targets = [ethers.ZeroAddress];
      const values = [0];
      const descriptionHash = ethers.id("Test proposal");

      await yuanDao.cancel(targets, values, descriptionHash);
      expect(await yuanDao.state(proposalId)).to.equal(2); // Canceled state
    });
  });
});