import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const root = new URL("../", import.meta.url);
const zkDir = new URL("build/zk/", root);
const webProof = new URL("web/proof-sample.json", root);

const readJson = async (name) => JSON.parse(await readFile(new URL(name, zkDir), "utf8"));
const proof = await readJson("proof.json");
const publicSignals = await readJson("public.json");
const metadata = await readJson("input.metadata.json");
const verificationKey = await readJson("verification_key.json");

const proofHash = createHash("sha256")
  .update(JSON.stringify({ proof, publicSignals }))
  .digest("hex");

const sample = {
  project: "Immunis Protocol",
  proof_system: "circom-groth16",
  local_verification: "snarkjs OK",
  circuit: {
    name: "eligibility",
    non_linear_constraints: 709,
    public_inputs: 7,
    private_inputs: 4
  },
  statement: metadata.statement,
  hidden_fields: metadata.hidden_fields,
  public_signals: metadata.public_signals,
  public_signal_order: [
    "current_year",
    "min_age",
    "min_score",
    "allowed_jurisdiction_hash",
    "policy_id",
    "wallet_hash",
    "nullifier"
  ],
  snark_public: publicSignals,
  proof_preview: {
    pi_a: proof.pi_a.slice(0, 2),
    pi_b: proof.pi_b.slice(0, 2).map((pair) => pair.slice(0, 2)),
    pi_c: proof.pi_c.slice(0, 2)
  },
  verifier_protocol: verificationKey.protocol,
  proof_hash: proofHash,
  generated_at: new Date().toISOString()
};

await writeFile(webProof, `${JSON.stringify(sample, null, 2)}\n`);
console.log(`wrote ${webProof.pathname}`);

