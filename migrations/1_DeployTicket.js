const TicketSystem = artifacts.require("TicketSystem");

module.exports = async function (deployer, network, accounts) {
  // 1. Deploy the contract
  await deployer.deploy(TicketSystem);
  const instance = await TicketSystem.deployed();
  
  // 2. Automatically create Listing #1 right after deployment
  const price = "10000000000000000"; // 0.01 ETH in Wei
  const supply = 50;
  const liveTime = Math.floor(Date.now() / 1000);

  await instance.createListing(price, supply, liveTime, { from: accounts[0] });
  console.log("Contract deployed & Listing #1 created automatically!");
};