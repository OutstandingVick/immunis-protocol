# Immunis Protocol

Private eligibility proofs for tokenized real-world assets on Stellar.

Immunis Protocol lets a wallet prove it is eligible for a regulated asset
pool without revealing the private KYC fields that made it eligible. The user
generates a zero-knowledge proof off-chain, submits the public signals to a
Stellar smart contract, receives an on-chain proof pass, and uses that pass to
deposit into a tokenized real-world asset vault.

Built for **Stellar Hacks: Real-World ZK**.

## Why This

Tokenized real-world assets need compliance, but public ledgers should not
become permanent KYC databases. The useful middle ground is:

1. An issuer checks private documents off-chain.
2. A ZK circuit proves the user satisfies policy rules.
3. A Stellar contract verifies the proof and records only a reusable pass.
4. Asset contracts check that pass instead of asking for raw personal data.
5. The user gets a selective disclosure receipt they can share with an issuer,
   auditor, or frontend without exposing the original KYC facts.

The first hackathon policy is intentionally simple: prove a wallet is
jurisdiction-approved, over the minimum age, and above the minimum investor
score, while exposing only a nullifier and policy id.

The product loop is intentionally concrete:

```text
private KYC facts
  -> ZK eligibility proof
  -> Immunis proof pass
  -> gated tokenized T-bill deposit
  -> selective disclosure receipt
```

## Project Shape

```text
immunis-protocol/
├── circuits/              # Circom eligibility circuit
├── contracts/proof_pass/  # Soroban pass registry + gated RWA vault scaffold
├── demo/                  # Deterministic local proof-pass demo
├── web/                   # Browser demo for the submission video
└── docs/                  # Hackathon narrative and demo script
```

## Demo Now

The local demo is dependency-free and runs with Node.js:

```bash
cd immunis-protocol/demo
npm run demo
```

It prints a proof packet, receipt, and RWA vault event with:

- `policy_id`: the public compliance policy.
- `wallet`: the Stellar account requesting a pass.
- `nullifier`: prevents replay across wallets/policies.
- `public_signals`: the data that would be passed to the Stellar verifier.
- `contract_event`: the event a successful on-chain verification emits.
- `selective_disclosure_receipt`: the shareable compliance receipt.
- `vault_event`: the accepted deposit into the tokenized asset vault.

For the browser demo, serve the single-file app from localhost so WebCrypto is
available:

```bash
cd immunis-protocol/web
python3 -m http.server 8087
```

Then open `http://localhost:8087`.

## ZK Path

The repo now includes a real local Groth16 proof workflow for the Circom circuit:

```bash
cd immunis-protocol
npm run zk:prove
```

That command compiles `circuits/eligibility.circom`, generates a witness,
creates `proof.json` and `public.json`, and verifies the proof with `snarkjs`.
It also exports `web/proof-sample.json` so the browser demo can display the real
Groth16 public signals. See `docs/zk-proof.md` for artifact details and public
signal ordering.

The on-chain verifier path is still intentionally separated:

1. Export a Stellar-compatible Groth16 verifier contract or verifier parameters.
2. Replace the adapter stub in `contracts/proof_pass/src/lib.rs` with the
   generated verifier call.
3. Deploy the Soroban contract and use the same public signals from the proof.

The hackathon page specifically points builders toward Circom/Groth16, Noir,
and RISC Zero. This project chooses Circom first because a small eligibility
circuit is easy to explain and Groth16 verification is a natural fit for an
on-chain pass registry.

## Submission Checklist

- Open-source repo with source and README.
- Two-minute demo video showing private proof generation, pass minting,
  selective disclosure receipt, and gated RWA deposit.
- Clear explanation that raw KYC fields never go on-chain.
- Optional stretch: deploy the `proof_pass` contract to Stellar testnet and
  include the contract id plus transaction links.
