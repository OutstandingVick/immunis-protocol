# ZK Proof Workflow

The project now has a real local Groth16 proof path for the eligibility circuit.

## Run

```bash
cd immunis-protocol
npm install
npm run zk:prove
```

If `circom` is missing:

```bash
cargo install --git https://github.com/iden3/circom.git --locked
```

## What It Generates

`npm run zk:prove` writes ignored build artifacts under `build/zk/`:

- `input.json`: private and public circuit inputs.
- `input.metadata.json`: human-readable statement and public signal labels.
- `eligibility.r1cs`: compiled circuit constraints.
- `eligibility_js/eligibility.wasm`: witness generator.
- `proof.json`: Groth16 proof.
- `public.json`: public signals.
- `verification_key.json`: verifier key.
- `web/proof-sample.json`: compact proof sample used by the browser demo.

The workflow ends with:

```text
snarkJS: OK!
```

That means the proof verified locally against the generated verification key.

## Public Signal Order

The circuit exposes seven public inputs:

1. `current_year`
2. `min_age`
3. `min_score`
4. `allowed_jurisdiction_hash`
5. `policy_id`
6. `wallet_hash`
7. `nullifier`

Raw `birth_year`, `investor_score`, and `jurisdiction_code` stay private.

## Current Trust Assumption

The proving key is generated with a local demo ceremony and is **not for
production**. For a production deployment, use a properly coordinated ceremony
or a trusted universal setup appropriate to the final verifier path.
