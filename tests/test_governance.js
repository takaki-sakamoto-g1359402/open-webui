const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GenesisDAO", function () {
  it("mints initial supply and guardian can pause", async function () {
    const [guardian, other] = await ethers.getSigners();
    const GenesisDAO = await ethers.getContractFactory("GenesisDAO");
    const impl = await GenesisDAO.deploy();
    await impl.deployed();
    const data = impl.interface.encodeFunctionData("initialize", [guardian.address]);
    const Proxy = await ethers.getContractFactory("ERC1967Proxy");
    const proxy = await Proxy.deploy(impl.address, data);
    const gdao = GenesisDAO.attach(await proxy.getAddress());
    expect(await gdao.totalSupply()).to.equal(ethers.parseUnits("1000000", 18));
    await gdao.connect(guardian).pause();
    await expect(gdao.transfer(other.address, 1)).to.be.reverted;
  });
});

describe("TreasuryAgent", function () {
  it("allows only automation to rebalance", async function () {
    const [guardian, automation, user] = await ethers.getSigners();
    const GenesisDAO = await ethers.getContractFactory("GenesisDAO");
    const impl = await GenesisDAO.deploy();
    await impl.deployed();
    const data = impl.interface.encodeFunctionData("initialize", [guardian.address]);
    const Proxy = await ethers.getContractFactory("ERC1967Proxy");
    const proxy = await Proxy.deploy(impl.address, data);
    const gdao = GenesisDAO.attach(await proxy.getAddress());

    const TreasuryAgent = await ethers.getContractFactory("TreasuryAgent");
    const treasury = await TreasuryAgent.deploy(automation.address, await gdao.getAddress());
    await expect(treasury.connect(user).rebalance()).to.be.revertedWith("Not automation");
    await expect(treasury.connect(automation).rebalance()).to.emit(treasury, "Rebalanced");
  });
});
