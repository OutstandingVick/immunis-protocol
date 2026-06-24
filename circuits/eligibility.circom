pragma circom 2.1.8;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/poseidon.circom";

// Proves that a wallet satisfies a public policy without revealing the
// underlying KYC fields.
//
// Private inputs:
// - wallet_secret: issuer-provided secret bound to the wallet holder.
// - birth_year: user's birth year.
// - investor_score: issuer risk/accreditation score.
// - jurisdiction_code: issuer-normalized jurisdiction code.
//
// Public inputs:
// - current_year: policy year used for age check.
// - min_age: minimum age required by the asset pool.
// - min_score: minimum score required by the asset pool.
// - allowed_jurisdiction_hash: Poseidon(jurisdiction_code).
// - policy_id: public id of this policy.
// - wallet_hash: Poseidon(wallet_secret).
// - nullifier: Poseidon(wallet_secret, policy_id).

template Eligibility() {
    signal input wallet_secret;
    signal input birth_year;
    signal input investor_score;
    signal input jurisdiction_code;

    signal input current_year;
    signal input min_age;
    signal input min_score;
    signal input allowed_jurisdiction_hash;
    signal input policy_id;
    signal input wallet_hash;
    signal input nullifier;

    signal age;
    age <== current_year - birth_year;

    component age_ok = GreaterEqThan(16);
    age_ok.in[0] <== age;
    age_ok.in[1] <== min_age;
    age_ok.out === 1;

    component score_ok = GreaterEqThan(16);
    score_ok.in[0] <== investor_score;
    score_ok.in[1] <== min_score;
    score_ok.out === 1;

    component jurisdiction_hash = Poseidon(1);
    jurisdiction_hash.inputs[0] <== jurisdiction_code;
    jurisdiction_hash.out === allowed_jurisdiction_hash;

    component wallet_commitment = Poseidon(1);
    wallet_commitment.inputs[0] <== wallet_secret;
    wallet_commitment.out === wallet_hash;

    component nullifier_hash = Poseidon(2);
    nullifier_hash.inputs[0] <== wallet_secret;
    nullifier_hash.inputs[1] <== policy_id;
    nullifier_hash.out === nullifier;
}

component main { public [
    current_year,
    min_age,
    min_score,
    allowed_jurisdiction_hash,
    policy_id,
    wallet_hash,
    nullifier
] } = Eligibility();
