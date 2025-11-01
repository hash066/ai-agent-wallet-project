import { expect } from "chai";
declare const ethers: any;

describe("AgentRegistry", function () {
  it("should deploy successfully", async function () {
    const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
    console.log("Deploying AgentRegistry...");
    const agentRegistry = await AgentRegistry.deploy();
    await agentRegistry.waitForDeployment();
    console.log("Deployment transaction:", agentRegistry.deploymentTransaction()?.hash);
    console.log("Contract address:", await agentRegistry.getAddress());
    const address = await agentRegistry.getAddress();
    expect(address).to.not.be.undefined;
    expect(address).to.not.be.null;
    expect(address).to.not.be.empty;
    expect(address).to.match(/^0x[a-fA-F0-9]{40}$/);
  });
});
