import { toNumber } from "@/app/utils/parse";
import { CalculatedReimbursement, CalculateReimbursementInput } from "@/types/mileage";

function roundCurrency(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateReimbursement({
    totalMiles,
    reimbursementRate,
}: CalculateReimbursementInput): CalculatedReimbursement {
    const rate = toNumber(reimbursementRate);

    if (rate === null) {
        return {
            reimbursementRate: null,
            reimbursementTotal: null,
        };
    }

    if (rate < 0) {
        throw new Error("Reimbursement rate cannot be negative.");
    }

    return {
        reimbursementRate: rate,
        reimbursementTotal: roundCurrency(totalMiles * rate),
    };
}