import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🚀 Deploying to Sepolia...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Deploy AgentRegistry
  console.log("\n📝 Deploying AgentRegistry...");
  const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
  const agentRegistry = await AgentRegistry.deploy();
  await agentRegistry.waitForDeployment();
  const agentRegistryAddress = await agentRegistry.getAddress();
  console.log("✅ AgentRegistry deployed to:", agentRegistryAddress);

  // Deploy AuditLog
  console.log("\n📝 Deploying AuditLog...");
  const AuditLog = await ethers.getContractFactory("AuditLog");
  const auditLog = await AuditLog.deploy();
  await auditLog.waitForDeployment();
  const auditLogAddress = await auditLog.getAddress();
  console.log("✅ AuditLog deployed to:", auditLogAddress);

  // Deploy PolicyEngine
  console.log("\n📝 Deploying PolicyEngine...");
  const PolicyEngine = await ethers.getContractFactory("PolicyEngine");
  const policyEngine = await PolicyEngine.deploy();
  await policyEngine.waitForDeployment();
  const policyEngineAddress = await policyEngine.getAddress();
  console.log("✅ PolicyEngine deployed to:", policyEngineAddress);

  // Deploy CrossChainExecutor
  console.log("\n📝 Deploying CrossChainExecutor...");
  const CrossChainExecutor = await ethers.getContractFactory("CrossChainExecutor");
  const crossChainExecutor = await CrossChainExecutor.deploy(agentRegistryAddress);
  await crossChainExecutor.waitForDeployment();
  const crossChainExecutorAddress = await crossChainExecutor.getAddress();
  console.log("✅ CrossChainExecutor deployed to:", crossChainExecutorAddress);

  // Deploy DelegationProof
  console.log("\n📝 Deploying DelegationProof...");
  const DelegationProof = await ethers.getContractFactory("DelegationProof");
  const delegationProof = await DelegationProof.deploy();
  await delegationProof.waitForDeployment();
  const delegationProofAddress = await delegationProof.getAddress();
  console.log("✅ DelegationProof deployed to:", delegationProofAddress);

  // Save deployment addresses
  const deploymentData = {
    network: "sepolia",
    chainId: 11155111,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      AgentRegistry: agentRegistryAddress,
      AuditLog: auditLogAddress,
      PolicyEngine: policyEngineAddress,
      CrossChainExecutor: crossChainExecutorAddress,
      DelegationProof: delegationProofAddress
    }
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(deploymentsDir, "sepolia.json"),
    JSON.stringify(deploymentData, null, 2)
  );

  console.log("\n💾 Deployment data saved to deployments/sepolia.json");
  
  console.log("\n🔍 Verify contracts with:");
  console.log(`npx hardhat verify --network sepolia ${agentRegistryAddress}`);
  console.log(`npx hardhat verify --network sepolia ${auditLogAddress}`);
  console.log(`npx hardhat verify --network sepolia ${policyEngineAddress}`);
  console.log(`npx hardhat verify --network sepolia ${crossChainExecutorAddress} ${agentRegistryAddress}`);
  console.log(`npx hardhat verify --network sepolia ${delegationProofAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
