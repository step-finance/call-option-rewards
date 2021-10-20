import BN from "https://esm.sh/v53/bn.js@5.2.0/es2021/bn.development.js";

const U64_MAX = new BN("18446744073709551615", 10);

export class PayerAmount {
    pool: string;
    nonStepMint: string;
    token: string;
    payer: string;
    amount: typeof BN; 
    stepMultiplier: typeof BN; 
    stepAmount: typeof BN; 
    constructor(pool: string, nonStepMint: string, token: string, payer: string, amount: typeof BN, stepMultiplier: typeof BN) {
        this.pool = pool;
        this.nonStepMint = nonStepMint;
        this.token = token;
        this.payer = payer;
        this.amount = (amount instanceof BN) ? amount : new BN(amount); 
        this.stepMultiplier = (stepMultiplier instanceof BN) ? stepMultiplier : new BN(stepMultiplier);
        this.stepAmount = this.amount.mul(this.stepMultiplier).div(U64_MAX);
    }
}

export class PoolFeesPaid {
    pubkey: string;
    pairedMint: string;
    feesPaid: string; 
    payers: PoolFeePayer[];

    constructor(pubkey: string, pairedMint: string, feesPaid: string) {
        this.pubkey = pubkey;
        this.pairedMint = pairedMint;
        this.feesPaid = feesPaid;
        this.payers = [];
    }

    addPayer(pubkey: string, amount: typeof BN) {
        amount = (amount instanceof BN) ? amount : new BN(amount); 
        this.payers.push(
            new PoolFeePayer(
                pubkey, 
                amount.toString(), 
                parseInt(amount.toString()) * 100 / parseInt(this.feesPaid)
            )
        );
    }
}

export class PoolFeePayer {
    pubkey: string;
    amount: string; 
    percentage: number; 

    constructor(pubkey: string, amount: string, percentage: number) {
        this.pubkey = pubkey;
        this.amount = amount;
        this.percentage = percentage;
    }
}