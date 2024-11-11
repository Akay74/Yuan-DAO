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
    await governanceToken.waitForDeployment();

    // Deploy Treasury contract
    Treasury = await ethers.getContractFactory("Treasury");
    treasury = await Treasury.deploy(await governanceToken.getAddress());
    await treasury.waitForDeployment();

    // Mint some tokens for testing
    await governanceToken.mint(owner.address, ethers.parseUnits("1000", 8));
    await governanceToken.mint(addr1.address, ethers.parseUnits("1000", 8));
  });

  describe("Deployment", function () {
    it("Should set the correct governance token", async function () {
      expect(await treasury.governanceToken()).to.equal(
        await governanceToken.getAddress()
      );
    });

    it("Should set the correct owner", async function () {
      expect(await treasury.owner()).to.equal(owner.address);
    });
  });

  describe("setWinningToken", function () {
    it("Should set the winning token correctly", async function () {
      const proposalId = ethers.id("proposal1");
      const option = 1;
      const winningToken = addr2.address;

      await expect(treasury.setWinningToken(proposalId, option, winningToken))
        .to.emit(treasury, "WinningTokenSet")
        .withArgs(proposalId, option, winningToken);

      expect(await treasury.getWinningToken(proposalId, option)).to.equal(
        winningToken
      );
    });

    it("Should revert when called by non-owner", async function () {
      const proposalId = ethers.id("proposal1");
      const option = 1;
      const winningToken = addr2.address;

      await expect(
        treasury
          .connect(addr1)
          .setWinningToken(proposalId, option, winningToken)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("burnGovernanceToken", function () {
    const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD";

    it("Should burn governance tokens correctly by sending to dead address", async function () {
      // Amount without decimals
      const rawAmount = 100;
      // Amount with decimals
      const scaledAmount = ethers.parseUnits("100", 8);

      // Transfer tokens to the treasury
      await governanceToken.transfer(await treasury.getAddress(), scaledAmount);

      const initialBalance = await governanceToken.balanceOf(
        await treasury.getAddress()
      );
      const initialDeadBalance = await governanceToken.balanceOf(DEAD_ADDRESS);
      expect(initialBalance).to.equal(scaledAmount);

      // "Burn" the tokens (transfer to dead address)
      await expect(treasury.burnGovernanceToken(rawAmount))
        .to.emit(treasury, "TokenBurned")
        .withArgs(scaledAmount);

      // Check treasury balance is 0
      const finalTreasuryBalance = await governanceToken.balanceOf(
        await treasury.getAddress()
      );
      expect(finalTreasuryBalance).to.equal(0);

      // Check dead address received the tokens
      const finalDeadBalance = await governanceToken.balanceOf(DEAD_ADDRESS);
      expect(finalDeadBalance).to.equal(initialDeadBalance + scaledAmount);
    });

    it("Should revert when burning more tokens than available", async function () {
      const rawAmount = 100;
      const scaledAmount = ethers.parseUnits("100", 8);

      // Transfer tokens to the treasury
      await governanceToken.transfer(await treasury.getAddress(), scaledAmount);

      // Try to burn more than available
      await expect(
        treasury.burnGovernanceToken(rawAmount + 1)
      ).to.be.revertedWithCustomError(treasury, "InsufficientFunds");
    });

    it("Should revert when called by non-owner", async function () {
      await expect(
        treasury.connect(addr1).burnGovernanceToken(100)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("transferVoteToken", function () {
    it("Should transfer vote tokens correctly", async function () {
      const rawAmount = 100;
      const scaledAmount = ethers.parseUnits("100", 8);

      await governanceToken
        .connect(addr1)
        .approve(await treasury.getAddress(), scaledAmount);

      await expect(treasury.connect(addr1).transferVoteToken(rawAmount))
        .to.emit(governanceToken, "Transfer")
        .withArgs(addr1.address, await treasury.getAddress(), scaledAmount);

      const treasuryBalance = await governanceToken.balanceOf(
        await treasury.getAddress()
      );
      expect(treasuryBalance).to.equal(scaledAmount);
    });

    it("Should revert when transferring more tokens than available", async function () {
      const amountToTransfer = ethers.parseUnits("1001", 8);

      await governanceToken
        .connect(addr1)
        .approve(await treasury.getAddress(), amountToTransfer);

      await expect(
        treasury.connect(addr1).transferVoteToken(1001)
      ).to.be.revertedWithCustomError(treasury, "InsufficientFunds");
    });

    it("Should revert when approval is not given", async function () {
      await expect(
        treasury.connect(addr1).transferVoteToken(100)
      ).to.be.revertedWith("ERC20: insufficient allowance");
    });
  });

  describe("getTokenBalance", function () {
    it("Should return the correct token balance", async function () {
      const amountToTransfer = ethers.parseUnits("100", 8);

      await governanceToken.transfer(
        await treasury.getAddress(),
        amountToTransfer
      );

      const balance = await treasury.getTokenBalance();
      expect(balance).to.equal(amountToTransfer);
    });
  });
});
