import { existsSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const buildDir = join(root, "build", "zk");
const circuit = join(root, "circuits", "eligibility.circom");

mkdirSync(buildDir, { recursive: true });

function run(command, args) {
  console.log(`\n$ ${[command, ...args].join(" ")}`);
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    env: process.env
  });
  if (result.error?.code === "ENOENT") {
    console.error(`\nMissing command: ${command}`);
    console.error(
      "Install Circom 2 first: cargo install --git https://github.com/iden3/circom.git --locked"
    );
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("node", ["scripts/generate-circom-input.mjs"]);
run("circom", [circuit, "--r1cs", "--wasm", "--sym", "-l", "node_modules", "-o", buildDir]);

const ptau0 = join(buildDir, "pot12_0000.ptau");
const ptau1 = join(buildDir, "pot12_0001.ptau");
const ptauFinal = join(buildDir, "pot12_final.ptau");
const zkey0 = join(buildDir, "eligibility_0000.zkey");
const zkeyFinal = join(buildDir, "eligibility_final.zkey");

if (!existsSync(ptauFinal)) {
  run("npx", ["snarkjs", "powersoftau", "new", "bn128", "12", ptau0]);
  run("npx", [
    "snarkjs",
    "powersoftau",
    "contribute",
    ptau0,
    ptau1,
    "--name=immunis-protocol-demo",
    "-e=not-for-production"
  ]);
  run("npx", ["snarkjs", "powersoftau", "prepare", "phase2", ptau1, ptauFinal]);
}

run("npx", ["snarkjs", "groth16", "setup", join(buildDir, "eligibility.r1cs"), ptauFinal, zkey0]);
run("npx", [
  "snarkjs",
  "zkey",
  "contribute",
  zkey0,
  zkeyFinal,
  "--name=demo-contribution",
  "-e=not-for-production"
]);
run("npx", [
  "snarkjs",
  "zkey",
  "export",
  "verificationkey",
  zkeyFinal,
  join(buildDir, "verification_key.json")
]);
run("npx", [
  "snarkjs",
  "wtns",
  "calculate",
  join(buildDir, "eligibility_js", "eligibility.wasm"),
  join(buildDir, "input.json"),
  join(buildDir, "witness.wtns")
]);
run("npx", [
  "snarkjs",
  "groth16",
  "prove",
  zkeyFinal,
  join(buildDir, "witness.wtns"),
  join(buildDir, "proof.json"),
  join(buildDir, "public.json")
]);
run("npx", [
  "snarkjs",
  "groth16",
  "verify",
  join(buildDir, "verification_key.json"),
  join(buildDir, "public.json"),
  join(buildDir, "proof.json")
]);
run("node", ["scripts/export-web-proof.mjs"]);

console.log("\nGenerated real Groth16 artifacts in build/zk:");
console.log("- proof.json");
console.log("- public.json");
console.log("- verification_key.json");
console.log("- input.metadata.json");
console.log("- web/proof-sample.json");
