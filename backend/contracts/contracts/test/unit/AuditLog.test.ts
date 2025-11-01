import { expect } from "chai";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
declare const ethers: any;

describe("AuditLog", function () {
  let auditLog: any;
  let owner: SignerWithAddress;
  let agent: SignerWithAddress;

  const agentId = ethers.id("agent1");
  const commitmentHash = ethers.id("commitment1");
  const ipfsCID = "QmCommitment123";

  beforeEach(async function () {
    [owner, agent] = await ethers.getSigners();
    const AuditLog = await ethers.getContractFactory("AuditLog");
    auditLog = await AuditLog.deploy();
    await auditLog.waitForDeployment();
  });

  describe("Commitment Logging", function () {
    it("Should log a commitment", async function () {
      await expect(
        auditLog.logCommitment(agentId, commitmentHash, ipfsCID)
      )
        .to.emit(auditLog, "CommitmentLogged")
        .withArgs(agentId, commitmentHash, ipfsCID, owner.address, 0);

      const exists = await auditLog.commitmentExists(commitmentHash);
      expect(exists).to.be.true;
    });

    it("Should prevent replay attacks", async function () {
      await auditLog.logCommitment(agentId, commitmentHash, ipfsCID);

      await expect(
        auditLog.logCommitment(agentId, commitmentHash, ipfsCID)
      ).to.be.revertedWithCustomError(auditLog, "CommitmentAlreadyExists");
    });

    it("Should reject invalid agent ID", async function () {
      await expect(
        auditLog.logCommitment(ethers.ZeroHash, commitmentHash, ipfsCID)
      ).to.be.revertedWithCustomError(auditLog, "InvalidAgentId");
    });

    it("Should reject invalid commitment", async function () {
      await expect(
        auditLog.logCommitment(agentId, ethers.ZeroHash, ipfsCID)
      ).to.be.revertedWithCustomError(auditLog, "InvalidCommitment");
    });
  });

  describe("Audit Trail Retrieval", function () {
    beforeEach(async function () {
      await auditLog.logCommitment(agentId, commitmentHash, ipfsCID);
      await auditLog.logCommitment(
        agentId,
        ethers.id("commitment2"),
        "QmCommitment456"
      );
    });

    it("Should retrieve audit trail for agent", async function () {
      const trail = await auditLog.getAuditTrail(agentId);
      expect(trail.length).to.equal(2);
      expect(trail[0].commitmentHash).to.equal(commitmentHash);
    });

    it("Should get specific audit entry", async function () {
      const entry = await auditLog.getAuditEntry(0);
      expect(entry.agentId).to.equal(agentId);
      expect(entry.commitmentHash).to.equal(commitmentHash);
      expect(entry.ipfsCID).to.equal(ipfsCID);
    });

    it("Should get audit trail length", async function () {
      const length = await auditLog.getAuditTrailLength();
      expect(length).to.equal(2);
    });

    it("Should get agent audit count", async function () {
      const count = await auditLog.getAgentAuditCount(agentId);
      expect(count).to.equal(2);
    });
  });

  describe("Empty Trail", function () {
    it("Should return empty trail for unknown agent", async function () {
      const unknownAgentId = ethers.id("unknown");
      const trail = await auditLog.getAuditTrail(unknownAgentId);
      expect(trail.length).to.equal(0);
    });
  });
});
