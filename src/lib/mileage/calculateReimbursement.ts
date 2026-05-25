import { toNumber } from "@/app/utils/parse";
import { CalculatedReimbursement, CalculateReimbursementInput } from "@/types/mileage";
import { getFederalMileageRateForDate } from "./mileageRates";

function roundCurrency(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateReimbursement({
    totalMiles,
    reimbursementRate,
    startDate,
}: CalculateReimbursementInput): CalculatedReimbursement {
    const providedRate = toNumber(reimbursementRate);
    const rate = providedRate ?? getFederalMileageRateForDate(startDate);

    if (rate < 0) {
        throw new Error("Reimbursement rate cannot be negative.");
    }

    return {
        reimbursementRate: rate,
        reimbursementTotal: roundCurrency(totalMiles * rate),
    };
}