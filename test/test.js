const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DAO Contracts", function () {
  let yuanDao;
  let daoSettings;
  let votesCounter;
  let daoTreasury;
  let governanceToken;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy GovernanceToken (assuming you have a separate contract for this)
    const GovernanceToken = await ethers.getContractFactory("GovernanceToken");
    governanceToken = await GovernanceToken.deploy("Governance Token", "GOV");
    await governanceToken.deployed();

    // Deploy DaoSettings
    const DaoSettings = await ethers.getContractFactory("DaoSettings");
    daoSettings = await DaoSettings.deploy(7200, 50400, ethers.utils.parseEther("100"));
    await daoSettings.deployed();

    // Deploy VotesCounter
    const VotesCounter = await ethers.getContractFactory("VotesCounter");
    votesCounter = await VotesCounter.deploy();
    await votesCounter.deployed();

    // Deploy YuanDao
    const YuanDao = await ethers.getContractFactory("YuanDao");
    yuanDao = await YuanDao.deploy("YuanDAO");
    await yuanDao.deployed();

    // Deploy DaoTreasury
    const DaoTreasury = await ethers.getContractFactory("DaoTreasury");
    daoTreasury = await DaoTreasury.deploy(governanceToken.address);
    await daoTreasury.deployed();
  });

  describe("YuanDao", function () {
    it("Should set the correct name", async function () {
      expect(await yuanDao.name()).to.equal("YuanDAO");
    });

    it("Should allow a proposal to be created", async function () {
      const targets = [addr1.address];
      const values = [0];
      const description = "Test proposal";

      await expect(yuanDao.propose(targets, values, description))
        .to.emit(yuanDao, "ProposalCreated");
    });

    it("Should allow voting on a proposal", async function () {
      const targets = [addr1.address];
      const values = [0];
      const description = "Test proposal";

      const proposeTx = await yuanDao.propose(targets, values, description);
      const receipt = await proposeTx.wait();
      const proposalId = receipt.events[0].args.proposalId;

      await ethers.provider.send("evm_increaseTime", [7200]); // Fast forward past voting delay
      await ethers.provider.send("evm_mine");

      await expect(yuanDao.castVote(proposalId, 1, 100))
        .to.emit(yuanDao, "VoteCast");
    });
  });

  describe("DaoSettings", function () {
    it("Should set correct initial values", async function () {
      expect(await daoSettings.votingDelay()).to.equal(7200);
      expect(await daoSettings.votingPeriod()).to.equal(50400);
      expect(await daoSettings.proposalThreshold()).to.equal(ethers.utils.parseEther("100"));
    });

    it("Should allow admin to update voting delay", async function () {
      await expect(daoSettings.setVotingDelay(14400))
        .to.emit(daoSettings, "VotingDelaySet")
        .withArgs(7200, 14400);

      expect(await daoSettings.votingDelay()).to.equal(14400);
    });
  });

  describe("VotesCounter", function () {
    it("Should correctly count votes", async function () {
      const proposalId = 1;
      await votesCounter._countVote(proposalId, addr1.address, 0, 100);
      await votesCounter._countVote(proposalId, addr2.address, 1, 200);

      const votes = await votesCounter.getProposalVotes(proposalId);
      expect(votes[0]).to.equal(100); // OptionA votes
      expect(votes[1]).to.equal(200); // OptionB votes
      expect(votes[2]).to.equal(300); // Total votes
    });
  });

  describe("DaoTreasury", function () {
    it("Should set the correct governance token", async function () {
      expect(await daoTreasury.governanceToken()).to.equal(governanceToken.address);
    });

    it("Should allow owner to set winning token", async function () {
      const proposalId = ethers.utils.id("proposal1");
      await daoTreasury.setWinningToken(proposalId, 0, addr1.address);
      expect(await daoTreasury.getWinningToken(proposalId, 0)).to.equal(addr1.address);
    });

    it("Should correctly transfer vote tokens", async function () {
      const amount = 100;
      await governanceToken.transfer(addr1.address, ethers.utils.parseEther("1000"));
      await governanceToken.connect(addr1).approve(daoTreasury.address, ethers.utils.parseEther("1000"));

      const initialBalance = await governanceToken.balanceOf(daoTreasury.address);
      await daoTreasury.connect(addr1)._transferVoteToken(amount);
      const finalBalance = await governanceToken.balanceOf(daoTreasury.address);

      expect(finalBalance.sub(initialBalance)).to.equal(ethers.utils.parseEther(amount.toString()));
    });
  });
});