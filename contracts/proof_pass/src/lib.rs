#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, xdr::ToXdr, Address, BytesN, Env, String};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Policy {
    pub issuer: Address,
    pub min_age: u32,
    pub min_score: u32,
    pub jurisdiction_hash: BytesN<32>,
    pub active: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProofPass {
    pub wallet: Address,
    pub policy_id: BytesN<32>,
    pub nullifier: BytesN<32>,
    pub verified_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RwaVault {
    pub issuer: Address,
    pub policy_id: BytesN<32>,
    pub asset_code: String,
    pub total_deposits: u128,
    pub active: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VaultPosition {
    pub wallet: Address,
    pub vault_id: BytesN<32>,
    pub amount: u128,
    pub updated_at: u64,
}

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Admin,
    Policy(BytesN<32>),
    Pass(Address, BytesN<32>),
    Nullifier(BytesN<32>),
    Vault(BytesN<32>),
    Position(Address, BytesN<32>),
}

#[contract]
pub struct ProofPassContract;

#[contractimpl]
impl ProofPassContract {
    pub fn init(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    pub fn set_policy(
        env: Env,
        policy_id: BytesN<32>,
        issuer: Address,
        min_age: u32,
        min_score: u32,
        jurisdiction_hash: BytesN<32>,
        active: bool,
    ) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        let policy = Policy {
            issuer,
            min_age,
            min_score,
            jurisdiction_hash,
            active,
        };
        env.storage()
            .persistent()
            .set(&DataKey::Policy(policy_id), &policy);
    }

    pub fn verify_and_mint(
        env: Env,
        wallet: Address,
        policy_id: BytesN<32>,
        nullifier: BytesN<32>,
        proof_digest: BytesN<32>,
    ) -> ProofPass {
        wallet.require_auth();

        let policy: Policy = env
            .storage()
            .persistent()
            .get(&DataKey::Policy(policy_id.clone()))
            .expect("missing policy");
        if !policy.active {
            panic!("inactive policy");
        }
        if env
            .storage()
            .persistent()
            .has(&DataKey::Nullifier(nullifier.clone()))
        {
            panic!("nullifier already used");
        }

        // Hackathon adapter seam:
        // Replace this digest check with the generated Groth16 verifier once
        // proving keys are generated from circuits/eligibility.circom.
        Self::verify_adapter(&env, &wallet, &policy_id, &nullifier, &proof_digest);

        let pass = ProofPass {
            wallet: wallet.clone(),
            policy_id: policy_id.clone(),
            nullifier: nullifier.clone(),
            verified_at: env.ledger().timestamp(),
        };

        env.storage()
            .persistent()
            .set(&DataKey::Pass(wallet.clone(), policy_id.clone()), &pass);
        env.storage()
            .persistent()
            .set(&DataKey::Nullifier(nullifier.clone()), &wallet);
        env.events().publish(
            (String::from_str(&env, "proof_pass_minted"), wallet, policy_id),
            nullifier,
        );

        pass
    }

    pub fn has_pass(env: Env, wallet: Address, policy_id: BytesN<32>) -> bool {
        env.storage()
            .persistent()
            .has(&DataKey::Pass(wallet, policy_id))
    }

    pub fn get_pass(env: Env, wallet: Address, policy_id: BytesN<32>) -> Option<ProofPass> {
        env.storage()
            .persistent()
            .get(&DataKey::Pass(wallet, policy_id))
    }

    pub fn open_vault(
        env: Env,
        vault_id: BytesN<32>,
        issuer: Address,
        policy_id: BytesN<32>,
        asset_code: String,
        active: bool,
    ) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        let vault = RwaVault {
            issuer,
            policy_id,
            asset_code,
            total_deposits: 0,
            active,
        };
        env.storage()
            .persistent()
            .set(&DataKey::Vault(vault_id), &vault);
    }

    pub fn deposit_to_vault(
        env: Env,
        wallet: Address,
        vault_id: BytesN<32>,
        amount: u128,
    ) -> VaultPosition {
        wallet.require_auth();
        if amount == 0 {
            panic!("zero deposit");
        }

        let mut vault: RwaVault = env
            .storage()
            .persistent()
            .get(&DataKey::Vault(vault_id.clone()))
            .expect("missing vault");
        if !vault.active {
            panic!("inactive vault");
        }
        if !Self::has_pass(env.clone(), wallet.clone(), vault.policy_id.clone()) {
            panic!("missing proof pass");
        }

        let key = DataKey::Position(wallet.clone(), vault_id.clone());
        let mut position = env.storage().persistent().get(&key).unwrap_or(VaultPosition {
            wallet: wallet.clone(),
            vault_id: vault_id.clone(),
            amount: 0,
            updated_at: 0,
        });

        position.amount += amount;
        position.updated_at = env.ledger().timestamp();
        vault.total_deposits += amount;

        env.storage().persistent().set(&DataKey::Vault(vault_id.clone()), &vault);
        env.storage().persistent().set(&key, &position);
        env.events().publish(
            (String::from_str(&env, "rwa_deposit_accepted"), wallet, vault_id),
            amount,
        );

        position
    }

    pub fn get_vault(env: Env, vault_id: BytesN<32>) -> Option<RwaVault> {
        env.storage().persistent().get(&DataKey::Vault(vault_id))
    }

    pub fn get_position(
        env: Env,
        wallet: Address,
        vault_id: BytesN<32>,
    ) -> Option<VaultPosition> {
        env.storage()
            .persistent()
            .get(&DataKey::Position(wallet, vault_id))
    }

    fn verify_adapter(
        env: &Env,
        wallet: &Address,
        policy_id: &BytesN<32>,
        nullifier: &BytesN<32>,
        proof_digest: &BytesN<32>,
    ) {
        let mut bytes = soroban_sdk::Bytes::new(env);
        bytes.append(&wallet.clone().to_xdr(env));
        bytes.append(&policy_id.clone().into());
        bytes.append(&nullifier.clone().into());
        let expected = env.crypto().sha256(&bytes).to_bytes();
        if expected != *proof_digest {
            panic!("invalid proof digest");
        }
    }
}
