const { ethers } = require("hardhat");

async function main() {
  const proxyAddress = process.env.PROXY_ADDRESS;
  if (!proxyAddress) throw new Error("PROXY_ADDRESS env var required");

  const GenesisDAO = await ethers.getContractFactory("GenesisDAO");
  const newImpl = await GenesisDAO.deploy();
  await newImpl.deployed();
  const proxy = await ethers.getContractAt("GenesisDAO", proxyAddress);
  const tx = await proxy.upgradeTo(newImpl.address);
  await tx.wait();
  console.log("Upgraded proxy", proxyAddress, "to", newImpl.address);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
