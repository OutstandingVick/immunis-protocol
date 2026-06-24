import { createHash, randomBytes } from "node:crypto";

const hash = (...parts) =>
  createHash("sha256")
    .update(parts.map(String).join("|"))
    .digest("hex");

const policy = {
  name: "US Accredited RWA Pool",
  policy_id: hash("immunis-protocol", "us-accredited-rwa-v1"),
  current_year: 2026,
  min_age: 18,
  min_score: 720,
  jurisdiction: "US",
};

const vault = {
  name: "Tokenized T-Bill Access Vault",
  vault_id: hash("immunis-protocol", "tbill-vault-v1"),
  asset_code: "USYC",
  deposit_amount: 2500,
};

const wallet = "GCBVZQZ5J4YEXAMPLESTELLARWALLET6W4RWA7KYC3PV2H";
const privateKyc = {
  birth_year: 1994,
  investor_score: 781,
  jurisdiction_code: "US",
  wallet_secret: randomBytes(16).toString("hex"),
};

function proveEligibility(policy, wallet, privateKyc) {
  const age = policy.current_year - privateKyc.birth_year;
  const ageOk = age >= policy.min_age;
  const scoreOk = privateKyc.investor_score >= policy.min_score;
  const jurisdictionHash = hash(privateKyc.jurisdiction_code);
  const allowedJurisdictionHash = hash(policy.jurisdiction);
  const jurisdictionOk = jurisdictionHash === allowedJurisdictionHash;

  if (!ageOk || !scoreOk || !jurisdictionOk) {
    throw new Error("Private KYC data does not satisfy policy");
  }

  const walletHash = hash(privateKyc.wallet_secret);
  const nullifier = hash(privateKyc.wallet_secret, policy.policy_id);
  const proofDigest = hash(wallet, policy.policy_id, nullifier);

  return {
    proof_system: "circom-groth16-adapter",
    wallet,
    policy_id: policy.policy_id,
    nullifier,
    proof_digest: proofDigest,
    public_signals: {
      current_year: policy.current_year,
      min_age: policy.min_age,
      min_score: policy.min_score,
      allowed_jurisdiction_hash: allowedJurisdictionHash,
      policy_id: policy.policy_id,
      wallet_hash: walletHash,
      nullifier,
    },
    private_fields_hidden: ["birth_year", "investor_score", "jurisdiction_code"],
  };
}

function verifyAndMintPass(packet) {
  const expectedDigest = hash(packet.wallet, packet.policy_id, packet.nullifier);
  if (packet.proof_digest !== expectedDigest) {
    throw new Error("Contract adapter rejected proof digest");
  }

  return {
    event: "proof_pass_minted",
    wallet: packet.wallet,
    policy_id: packet.policy_id,
    nullifier: packet.nullifier,
    verified_at: new Date().toISOString(),
  };
}

function issueSelectiveDisclosureReceipt(packet, contractEvent) {
  return {
    receipt_type: "selective_disclosure_policy_receipt",
    statement: "Wallet satisfies policy without revealing private KYC fields",
    wallet: packet.wallet,
    policy_id: packet.policy_id,
    nullifier: packet.nullifier,
    verified_at: contractEvent.verified_at,
    reveals: ["policy_id", "wallet", "nullifier", "verified_at"],
    hides: packet.private_fields_hidden,
    receipt_hash: hash(
      "receipt",
      packet.wallet,
      packet.policy_id,
      packet.nullifier,
      contractEvent.verified_at,
    ),
  };
}

function depositToRwaVault(packet, receipt, vault) {
  if (!receipt || receipt.policy_id !== packet.policy_id) {
    throw new Error("Vault rejected deposit: missing proof pass");
  }

  return {
    event: "rwa_deposit_accepted",
    vault_id: vault.vault_id,
    asset_code: vault.asset_code,
    wallet: packet.wallet,
    amount: vault.deposit_amount,
    policy_id: packet.policy_id,
    receipt_hash: receipt.receipt_hash,
  };
}

const packet = proveEligibility(policy, wallet, privateKyc);
const contractEvent = verifyAndMintPass(packet);
const receipt = issueSelectiveDisclosureReceipt(packet, contractEvent);
const vaultEvent = depositToRwaVault(packet, receipt, vault);

console.log(
  JSON.stringify(
    {
      project: "Immunis Protocol",
      policy,
      vault,
      proof_packet: packet,
      contract_event: contractEvent,
      selective_disclosure_receipt: receipt,
      vault_event: vaultEvent,
      takeaway:
        "The chain sees a policy pass and vault deposit; it never sees birth year, score, or jurisdiction source data.",
    },
    null,
    2,
  ),
);
