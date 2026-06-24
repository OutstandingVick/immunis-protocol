import { mkdir, writeFile } from "node:fs/promises";
import { buildPoseidon } from "circomlibjs";

const outDir = new URL("../build/zk/", import.meta.url);
const poseidon = await buildPoseidon();
const field = poseidon.F;

const hash = (values) => field.toString(poseidon(values.map(BigInt)));

const privateKyc = {
  wallet_secret: 123456789n,
  birth_year: 1994n,
  investor_score: 781n,
  jurisdiction_code: 840n
};

const policy = {
  current_year: 2026n,
  min_age: 18n,
  min_score: 720n,
  policy_id: 1001n
};

const input = {
  wallet_secret: privateKyc.wallet_secret.toString(),
  birth_year: privateKyc.birth_year.toString(),
  investor_score: privateKyc.investor_score.toString(),
  jurisdiction_code: privateKyc.jurisdiction_code.toString(),
  current_year: policy.current_year.toString(),
  min_age: policy.min_age.toString(),
  min_score: policy.min_score.toString(),
  allowed_jurisdiction_hash: hash([privateKyc.jurisdiction_code]),
  policy_id: policy.policy_id.toString(),
  wallet_hash: hash([privateKyc.wallet_secret]),
  nullifier: hash([privateKyc.wallet_secret, policy.policy_id])
};

const metadata = {
  statement:
    "Wallet satisfies the RWA eligibility policy without revealing raw KYC fields.",
  hidden_fields: ["birth_year", "investor_score", "jurisdiction_code"],
  public_signals: {
    current_year: input.current_year,
    min_age: input.min_age,
    min_score: input.min_score,
    allowed_jurisdiction_hash: input.allowed_jurisdiction_hash,
    policy_id: input.policy_id,
    wallet_hash: input.wallet_hash,
    nullifier: input.nullifier
  }
};

await mkdir(outDir, { recursive: true });
await writeFile(new URL("input.json", outDir), `${JSON.stringify(input, null, 2)}\n`);
await writeFile(
  new URL("input.metadata.json", outDir),
  `${JSON.stringify(metadata, null, 2)}\n`
);

console.log(`wrote ${new URL("input.json", outDir).pathname}`);
console.log(`wrote ${new URL("input.metadata.json", outDir).pathname}`);

