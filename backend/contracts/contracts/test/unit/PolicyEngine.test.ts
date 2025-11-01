import { expect } from "chai";

declare const ethers: any;

describe("PolicyEngine", function () {
  it("should deploy successfully", async function () {
    const PolicyEngine = await ethers.getContractFactory("PolicyEngine");
    console.log("Deploying PolicyEngine...");
    const policyEngine = await PolicyEngine.deploy();
    await policyEngine.waitForDeployment();
    console.log("Contract address:", await policyEngine.getAddress());
    const address = await policyEngine.getAddress();
    expect(address).to.not.be.undefined;
    expect(address).to.not.be.null;
    expect(address).to.not.be.empty;
    expect(address).to.match(/^0x[a-fA-F0-9]{40}$/);
  });
});
