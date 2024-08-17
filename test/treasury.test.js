const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Treasury", function () {
  let Treasury, treasury, owner, addr1, governanceToken;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy a mock ERC20 token to use as the governance token
    const MockToken = await ethers.getContractFactory("MockERC20");
    governanceToken = await MockToken.deploy("Governance Token", "GOV");

    Treasury = await ethers.getContractFactory("Treasury");
    treasury = await Treasury.deploy(governanceToken.address);
    await treasury.deployed();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await treasury.owner()).to.equal(owner.address);
    });

    it("Should set the correct governance token", async function () {
      expect(await treasury.governanceToken()).to.equal(
        governanceToken.address
      );
    });

    it("Should revert if zero address is provided for governance token", async function () {
      const TreasuryFactory = await ethers.getContractFactory("Treasury");
      await expect(
        TreasuryFactory.deploy(ethers.constants.AddressZero)
      ).to.be.revertedWithCustomError(TreasuryFactory, "ZeroAddress");
    });
  });

  describe("setWinningToken", function () {
    it("Should set the winning token correctly", async function () {
      const proposalId = ethers.utils.id("proposal1");
      const option = 1;
      const winningToken = addr1.address;

      await treasury.setWinningToken(proposalId, option, winningToken);

      expect(await treasury.getWinningToken(proposalId, option)).to.equal(
        winningToken
      );
    });

    it("Should emit WinningTokenSet event", async function () {
      const proposalId = ethers.utils.id("proposal1");
      const option = 1;
      const winningToken = addr1.address;

      await expect(treasury.setWinningToken(proposalId, option, winningToken))
        .to.emit(treasury, "WinningTokenSet")
        .withArgs(proposalId, option, winningToken);
    });

    it("Should revert if called by non-owner", async function () {
      const proposalId = ethers.utils.id("proposal1");
      const option = 1;
      const winningToken = addr1.address;

      await expect(
        treasury
          .connect(addr1)
          .setWinningToken(proposalId, option, winningToken)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("burnGovernanceToken", function () {
    it("Should burn the correct amount of tokens", async function () {
      const burnAmount = ethers.utils.parseUnits("100", 8); // Assuming 8 decimals
      await governanceToken.transfer(treasury.address, burnAmount);

      await expect(treasury.burnGovernanceToken(100))
        .to.emit(treasury, "TokenBurned")
        .withArgs(100);

      expect(await governanceToken.balanceOf(treasury.address)).to.equal(0);
    });

    it("Should revert if there are insufficient funds", async function () {
      await expect(
        treasury.burnGovernanceToken(100)
      ).to.be.revertedWithCustomError(treasury, "InsufficientFunds");
    });

    it("Should revert if called by non-owner", async function () {
      await expect(
        treasury.connect(addr1).burnGovernanceToken(100)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("transferVoteToken", function () {
    it("Should transfer tokens correctly", async function () {
      const transferAmount = ethers.utils.parseUnits("100", 8); // Assuming 8 decimals
      await governanceToken.transfer(addr1.address, transferAmount);
      await governanceToken
        .connect(addr1)
        .approve(treasury.address, transferAmount);

      await treasury.connect(addr1).transferVoteToken(100);

      expect(await governanceToken.balanceOf(treasury.address)).to.equal(
        transferAmount
      );
    });

    it("Should revert if there are insufficient funds", async function () {
      await expect(
        treasury.connect(addr1).transferVoteToken(100)
      ).to.be.revertedWithCustomError(treasury, "InsufficientFunds");
    });

    it("Should revert if approval fails", async function () {
      const transferAmount = ethers.utils.parseUnits("100", 8); // Assuming 8 decimals
      await governanceToken.transfer(addr1.address, transferAmount);

      await expect(
        treasury.connect(addr1).transferVoteToken(100)
      ).to.be.revertedWithCustomError(treasury, "ApprovalFailed");
    });
  });

  describe("getTokenBalance", function () {
    it("Should return the correct token balance", async function () {
      const transferAmount = ethers.utils.parseUnits("100", 8); // Assuming 8 decimals
      await governanceToken.transfer(treasury.address, transferAmount);

      expect(await treasury.getTokenBalance()).to.equal(transferAmount);
    });
  });
});
