const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('DaoSettings', () => {
  let daoSettings;
  let owner;
  let admin;
  let nonAdmin;

  beforeEach(async () => {
    [owner, admin, nonAdmin] = await ethers.getSigners();

    const DaoSettings = await ethers.getContractFactory('DaoSettings');
    daoSettings = await DaoSettings.deploy(10, 100, 1000);
    await daoSettings.deployed();
  });

  describe('Deployment', () => {
    it('should set the correct initial values', async () => {
      expect(await daoSettings.votingDelay()).to.equal(10);
      expect(await daoSettings.votingPeriod()).to.equal(100);
      expect(await daoSettings.proposalThreshold()).to.equal(1000);
      expect(await daoSettings.hasRole(await daoSettings.ADMIN_ROLE(), owner.address)).to.be.true;
    });
  });

  describe('setVotingDelay', () => {
    it('should only be callable by an admin', async () => {
      await expect(daoSettings.connect(nonAdmin).setVotingDelay(20)).to.be.revertedWith('AccessControl: account 0x... is missing role 0x...');
      await daoSettings.connect(admin).setVotingDelay(20);
      expect(await daoSettings.votingDelay()).to.equal(20);
    });
  });

  describe('setVotingPeriod', () => {
    it('should only be callable by an admin', async () => {
      await expect(daoSettings.connect(nonAdmin).setVotingPeriod(200)).to.be.revertedWith('AccessControl: account 0x... is missing role 0x...');
      await daoSettings.connect(admin).setVotingPeriod(200);
      expect(await daoSettings.votingPeriod()).to.equal(200);
    });

    it('should not allow a voting period of 0', async () => {
      await expect(daoSettings.connect(admin).setVotingPeriod(0)).to.be.revertedWith('GovernorInvalidVotingPeriod(0)');
    });
  });

  describe('setProposalThreshold', () => {
    it('should only be callable by an admin', async () => {
      await expect(daoSettings.connect(nonAdmin).setProposalThreshold(2000)).to.be.revertedWith('AccessControl: account 0x... is missing role 0x...');
      await daoSettings.connect(admin).setProposalThreshold(2000);
      expect(await daoSettings.proposalThreshold()).to.equal(2000);
    });
  });
});