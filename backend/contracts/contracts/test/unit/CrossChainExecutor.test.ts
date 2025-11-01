import { expect } from "chai";
declare const ethers: any;

describe("CrossChainExecutor", function () {
  it("should deploy successfully", async function () {
    // Deploy registry
    const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
    const registry = await AgentRegistry.deploy();
    await registry.waitForDeployment();

    // Deploy policy engine
    const PolicyEngineFactory = await ethers.getContractFactory("PolicyEngine");
    const policyEngine = await PolicyEngineFactory.deploy();
    await policyEngine.waitForDeployment();

    // Deploy executor
    const CrossChainExecutor = await ethers.getContractFactory("CrossChainExecutor");
    const executor = await CrossChainExecutor.deploy(
      await registry.getAddress(),
      await policyEngine.getAddress()
    );
    await executor.waitForDeployment();

    const address = await executor.getAddress();
    expect(address).to.not.be.undefined;
    expect(address).to.not.be.null;
    expect(address).to.match(/^0x[a-fA-F0-9]{40}$/);
  });
});

  describe("Intent Emission", function () {
    it("Should emit an intent", async function () {
      const intentId = ethers.id("intent1");
      const actionHash = ethers.id("transfer");
      const nonce = 0;
      const expiry = Math.floor(Date.now() / 1000) + 3600;

      const intent = {
        intentId,
        agentId,
        srcChainId: 11155111, // Sepolia
        destChainId,
        actionHash,
        nonce,
        expiry,
        value: ethers.parseEther("0.1"),
        recipient: agent.address
      };

      // Create EIP-712 signature
      const domain = {
        name: "AgentWallet",
        version: "1",
        chainId: 11155111,
        verifyingContract: await executor.getAddress()
      };

      const types = {
        Intent: [
          { name: "intentId", type: "bytes32" },
          { name: "agentId", type: "bytes32" },
          { name: "srcChainId", type: "uint256" },
          { name: "destChainId", type: "uint256" },
          { name: "actionHash", type: "bytes32" },
          { name: "nonce", type: "uint256" },
          { name: "expiry", type: "uint256" },
          { name: "value", type: "uint256" },
          { name: "recipient", type: "address" }
        ]
      };

      const signature = await agent.signTypedData(domain, types, intent);

      await expect(executor.connect(agent).emitIntent(intent, signature))
        .to.emit(executor, "IntentEmitted")
        .withArgs(intentId, agentId, destChainId, actionHash, nonce, expiry);

      const storedIntent = await executor.getIntent(intentId);
      expect(storedIntent.intent.intentId).to.equal(intentId);
      expect(storedIntent.status).to.equal(1); // Pending
    });

    it("Should reject duplicate intent", async function () {
      const intentId = ethers.id("intent1");
      const actionHash = ethers.id("transfer");
      const nonce = 0;
      const expiry = Math.floor(Date.now() / 1000) + 3600;

      const intent = {
        intentId,
        agentId,
        srcChainId: 11155111,
        destChainId,
        actionHash,
        nonce,
        expiry,
        value: ethers.parseEther("0.1"),
        recipient: agent.address
      };

      const domain = {
        name: "AgentWallet",
        version: "1",
        chainId: 11155111,
        verifyingContract: await executor.getAddress()
      };

      const types = {
        Intent: [
          { name: "intentId", type: "bytes32" },
          { name: "agentId", type: "bytes32" },
          { name: "srcChainId", type: "uint256" },
          { name: "destChainId", type: "uint256" },
          { name: "actionHash", type: "bytes32" },
          { name: "nonce", type: "uint256" },
          { name: "expiry", type: "uint256" },
          { name: "value", type: "uint256" },
          { name: "recipient", type: "address" }
        ]
      };

      const signature = await agent.signTypedData(domain, types, intent);

      await executor.connect(agent).emitIntent(intent, signature);

      await expect(
        executor.connect(agent).emitIntent(intent, signature)
      ).to.be.revertedWithCustomError(executor, "IntentAlreadyExists");
    });

    it("Should reject invalid nonce", async function () {
      const intentId = ethers.id("intent1");
      const actionHash = ethers.id("transfer");
      const nonce = 5; // Wrong nonce
      const expiry = Math.floor(Date.now() / 1000) + 3600;

      const intent = {
        intentId,
        agentId,
        srcChainId: 11155111,
        destChainId,
        actionHash,
        nonce,
        expiry,
        value: ethers.parseEther("0.1"),
        recipient: agent.address
      };

      const domain = {
        name: "AgentWallet",
        version: "1",
        chainId: 11155111,
        verifyingContract: await executor.getAddress()
      };

      const types = {
        Intent: [
          { name: "intentId", type: "bytes32" },
          { name: "agentId", type: "bytes32" },
          { name: "srcChainId", type: "uint256" },
          { name: "destChainId", type: "uint256" },
          { name: "actionHash", type: "bytes32" },
          { name: "nonce", type: "uint256" },
          { name: "expiry", type: "uint256" },
          { name: "value", type: "uint256" },
          { name: "recipient", type: "address" }
        ]
      };

      const signature = await agent.signTypedData(domain, types, intent);

      await expect(
        executor.connect(agent).emitIntent(intent, signature)
      ).to.be.revertedWithCustomError(executor, "InvalidNonce");
    });
  });

  describe("Nonce Management", function () {
    it("Should increment nonce after intent emission", async function () {
      const initialNonce = await executor.getNonce(agentId);
      expect(initialNonce).to.equal(0);

      const intentId = ethers.id("intent1");
      const actionHash = ethers.id("transfer");
      const expiry = Math.floor(Date.now() / 1000) + 3600;

      const intent = {
        intentId,
        agentId,
        srcChainId: 11155111,
        destChainId,
        actionHash,
        nonce: 0,
        expiry,
        value: ethers.parseEther("0.1"),
        recipient: agent.address
      };

      const domain = {
        name: "AgentWallet",
        version: "1",
        chainId: 11155111,
        verifyingContract: await executor.getAddress()
      };

      const types = {
        Intent: [
          { name: "intentId", type: "bytes32" },
          { name: "agentId", type: "bytes32" },
          { name: "srcChainId", type: "uint256" },
          { name: "destChainId", type: "uint256" },
          { name: "actionHash", type: "bytes32" },
          { name: "nonce", type: "uint256" },
          { name: "expiry", type: "uint256" },
          { name: "value", type: "uint256" },
          { name: "recipient", type: "address" }
        ]
      };

      const signature = await agent.signTypedData(domain, types, intent);

      await executor.connect(agent).emitIntent(intent, signature);

      const newNonce = await executor.getNonce(agentId);
      expect(newNonce).to.equal(1);
    });
  });

  describe("Relayer Management", function () {
    it("Should authorize relayer", async function () {
      const newRelayer = ethers.Wallet.createRandom().address;
      
      await expect(executor.authorizeRelayer(newRelayer))
        .to.emit(executor, "RelayerAuthorized")
        .withArgs(newRelayer);

      expect(await executor.authorizedRelayers(newRelayer)).to.be.true;
    });

    it("Should revoke relayer", async function () {
      await expect(executor.revokeRelayer(relayer.address))
        .to.emit(executor, "RelayerRevoked")
        .withArgs(relayer.address);

      expect(await executor.authorizedRelayers(relayer.address)).to.be.false;
    });
  });
});
