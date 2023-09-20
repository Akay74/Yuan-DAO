const { expect } = require("chai");
const { ethers } = require("hardhat");
const { AssetManagerAccess, MarketplaceAccess } = require("./data");

describe("Asset", function () {
  let assetContract;
  let deployer;
  let user1;

  beforeEach(async () => {
    [deployer, user1] = await ethers.getSigners();

    const AssetFactory = await ethers.getContractFactory("BaseAsset");
    assetContract = await AssetFactory.deploy(
      "Polytrade Asset Collection",
      "PAC",
      "2.2",
      "https://ipfs.io/ipfs"
    );

    await assetContract.waitForDeployment();
  });

  it("Should revert on creating asset by invalid caller", async function () {
    await expect(
      assetContract
        .connect(deployer)
        .createAsset(deployer.getAddress(), 1, 1, 10000)
    ).to.be.revertedWith(
      `AccessControl: account ${(
        await deployer.getAddress()
      ).toLowerCase()} is missing role ${AssetManagerAccess}`
    );
  });

  it("Should revert on updating purchase date by invalid caller", async function () {
    await expect(
      assetContract.connect(deployer).updatePurchaseDate(1, 1)
    ).to.be.revertedWith(
      `AccessControl: account ${(
        await deployer.getAddress()
      ).toLowerCase()} is missing role ${MarketplaceAccess}`
    );
  });

  it("Should revert on burning asset by invalid caller", async function () {
    await expect(
      assetContract
        .connect(deployer)
        .burnAsset(deployer.getAddress(), 1, 1, 10000)
    ).to.be.revertedWith(
      `AccessControl: account ${(
        await deployer.getAddress()
      ).toLowerCase()} is missing role ${AssetManagerAccess}`
    );
  });

  it("Should to set new base uri", async function () {
    await expect(assetContract.setBaseURI(1, "https://ipfs2.io/ipfs")).to.not.be
      .reverted;
  });

  it("Should revert to set new base uri by invalid caller", async function () {
    await expect(
      assetContract.connect(user1).setBaseURI(1, "https://ipfs2.io/ipfs")
    ).to.be.reverted;
  });
});
