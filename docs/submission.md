# Submission Narrative

## One-Liner

Immunis Protocol is private compliance infrastructure for tokenized real-world
assets on Stellar.

## Problem

Real-world asset protocols need to enforce eligibility rules, but publishing raw
KYC or accreditation data on-chain is unacceptable. Today, most demos either
skip compliance entirely or push it into opaque centralized allowlists.

## Solution

The issuer checks private user data off-chain. The user proves, in zero
knowledge, that the private data satisfies a public policy. The Stellar contract
verifies the proof and stores a pass keyed by wallet and policy id. A tokenized
RWA vault then checks `has_pass(wallet, policy_id)` before accepting deposits.

The differentiator is the product loop: this is not just a verifier demo. It
turns a private proof into a usable access credential and then into a compliant
asset action.

## ZK Role

ZK is load-bearing. Without the proof, the contract refuses to mint a pass.
The proof hides birth year, investor score, and jurisdiction while exposing the
minimum public signals needed to prevent replay.

The selective disclosure receipt reveals only policy id, wallet, nullifier, and
verification time. It hides the underlying KYC facts but gives institutions a
portable proof of policy satisfaction.

The repo includes a real local Groth16 proof workflow:

```bash
npm run zk:prove
```

That command compiles the Circom circuit, generates a witness, creates
`proof.json` and `public.json`, and verifies the proof with `snarkjs`.

## Stellar Role

Stellar is the settlement and access-control layer. The pass registry and gated
vault live in a Soroban contract, emit auditable events, and can be reused by
tokenized funds, payment rails, or redemption flows.

## Demo Video Script

1. Show Immunis Protocol with the policy and tokenized T-bill vault panels.
2. Click "Generate Proof" and point out which fields stay private.
3. Click "Mint Pass" and show the selective disclosure receipt.
4. Click "Deposit To Vault" and show the accepted RWA deposit event.
5. Run `npm run demo` to show the same proof, receipt, and vault event as JSON.
6. Briefly show `circuits/eligibility.circom` and `contracts/proof_pass/src/lib.rs`.

## Stretch Goals

- Replace the contract adapter digest check with a Stellar-compatible Groth16
  verifier call.
- Deploy to Stellar testnet.
- Add pass expiration and issuer revocation.
- Integrate a Stellar token transfer into the gated vault deposit path.
