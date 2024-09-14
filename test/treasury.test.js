const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Treasury", function () {
  let Treasury, treasury, GovernanceToken, governanceToken;
  let owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock GovernanceToken
    GovernanceToken = await ethers.getContractFactory("MockERC20");
    governanceToken = await GovernanceToken.deploy("GovernanceToken", "GT", 8);
    await governanceToken.deployed();

    // Deploy Treasury contract
    Treasury = await ethers.getContractFactory("Treasury");
    treasury = await Treasury.deploy(governanceToken.address);
    await treasury.deployed();

    // Mint some tokens for testing
    await governanceToken.mint(owner.address, ethers.utils.parseUnits("1000", 8));
    await governanceToken.mint(addr1.address, ethers.utils.parseUnits("1000", 8));
  });

  describe("Deployment", function () {
    it("Should set the correct governance token", async function () {
      expect(await treasury.governanceToken()).to.equal(governanceToken.address);
    });

    it("Should set the correct owner", async function () {
      expect(await treasury.owner()).to.equal(owner.address);
    });
  });

  describe("setWinningToken", function () {
    it("Should set the winning token correctly", async function () {
      const proposalId = ethers.utils.id("proposal1");
      const option = 1;
      const winningToken = addr2.address;

      await expect(treasury.setWinningToken(proposalId, option, winningToken))
        .to.emit(treasury, "WinningTokenSet")
        .withArgs(proposalId, option, winningToken);

      expect(await treasury.getWinningToken(proposalId, option)).to.equal(winningToken);
    });

    it("Should revert when called by non-owner", async function () {
      const proposalId = ethers.utils.id("proposal1");
      const option = 1;
      const winningToken = addr2.address;

      await expect(
        treasury.connect(addr1).setWinningToken(proposalId, option, winningToken)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("burnGovernanceToken", function () {
    it("Should burn governance tokens correctly", async function () {
      const amountToBurn = ethers.utils.parseUnits("100", 8);
      
      // Transfer tokens to the treasury
      await governanceToken.transfer(treasury.address, amountToBurn);

      await expect(treasury.burnGovernanceToken(100))
        .to.emit(treasury, "TokenBurned")
        .withArgs(100);

      const treasuryBalance = await governanceToken.balanceOf(treasury.address);
      expect(treasuryBalance).to.equal(0);
    });

    it("Should revert when burning more tokens than available", async function () {
      const amountToBurn = ethers.utils.parseUnits("100", 8);
      
      // Transfer tokens to the treasury
      await governanceToken.transfer(treasury.address, amountToBurn);

      await expect(treasury.burnGovernanceToken(101)).to.be.revertedWith("InsufficientFunds");
    });

    it("Should revert when called by non-owner", async function () {
      await expect(treasury.connect(addr1).burnGovernanceToken(100)).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("transferVoteToken", function () {
    it("Should transfer vote tokens correctly", async function () {
      const amountToTransfer = ethers.utils.parseUnits("100", 8);
      
      await governanceToken.connect(addr1).approve(treasury.address, amountToTransfer);
      
      await expect(treasury.connect(addr1).transferVoteToken(100))
        .to.emit(governanceToken, "Transfer")
        .withArgs(addr1.address, treasury.address, amountToTransfer);

      const treasuryBalance = await governanceToken.balanceOf(treasury.address);
      expect(treasuryBalance).to.equal(amountToTransfer);
    });

    it("Should revert when transferring more tokens than available", async function () {
      const amountToTransfer = ethers.utils.parseUnits("1001", 8);
      
      await governanceToken.connect(addr1).approve(treasury.address, amountToTransfer);
      
      await expect(treasury.connect(addr1).transferVoteToken(1001)).to.be.revertedWith("InsufficientFunds");
    });

    it("Should revert when approval fails", async function () {
      await expect(treasury.connect(addr1).transferVoteToken(100)).to.be.revertedWith("ApprovalFailed");
    });
  });

  describe("getTokenBalance", function () {
    it("Should return the correct token balance", async function () {
      const amountToTransfer = ethers.utils.parseUnits("100", 8);
      
      await governanceToken.transfer(treasury.address, amountToTransfer);

      const balance = await treasury.getTokenBalance();
      expect(balance).to.equal(amountToTransfer);
    });
  });
});