const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with", deployer.address);

  const GenesisDAO = await ethers.getContractFactory("GenesisDAO");
  const gdaoImpl = await GenesisDAO.deploy();
  await gdaoImpl.deployed();
  const initData = gdaoImpl.interface.encodeFunctionData("initialize", [deployer.address]);
  const ERC1967Proxy = await ethers.getContractFactory("ERC1967Proxy");
  const proxy = await ERC1967Proxy.deploy(gdaoImpl.address, initData);
  await proxy.deployed();
  console.log("GenesisDAO proxy:", proxy.address);

  const TreasuryAgent = await ethers.getContractFactory("TreasuryAgent");
  const treasury = await TreasuryAgent.deploy(deployer.address, proxy.address);
  await treasury.deployed();
  console.log("TreasuryAgent:", treasury.address);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
