import { CalculateMileageLlcSplitsInput, CalculateMileageLlcSplitsResult } from "@/types/mileage";


function splitNumEvenly(total: number, parts: number): number[] {
    if (parts <= 0) return [];

    const roundedTotal = Math.round((total + Number.EPSILON) * 100);
    const base = Math.floor(roundedTotal / parts);
    const remainder = roundedTotal - base * parts;

    return Array.from({ length: parts }, (_, index) => {
        const cents = base + (index === parts - 1 ? remainder : 0);
        return Number((cents / 100).toFixed(2));
    });
}

export function calculateMileageLlcSplits({
    llcs,
    totalMiles,
    reimbursementTotal,
}: CalculateMileageLlcSplitsInput): CalculateMileageLlcSplitsResult {
    if (llcs.length === 0) {
        return {
            splitMethod: "none",
            llcSplits: [],
        };
    }

    if (llcs.length === 1) {
        return {
            splitMethod: "single_llc",
            llcSplits: [
                {
                    llc: llcs[0],
                    miles: Number(totalMiles.toFixed(2)),
                    reimbursement_total: reimbursementTotal === null ? null : Number(reimbursementTotal.toFixed(2)),
                },
            ],
        };
    }

    const splitMiles = splitNumEvenly(totalMiles, llcs.length);

    const splitReimbursements = reimbursementTotal === null ? llcs.map(() => null) : splitNumEvenly(reimbursementTotal, llcs.length);

    return {
        splitMethod: "auto_even",
        llcSplits: llcs.map((llc, index) => ({
            llc,
            miles: splitMiles[index],
            reimbursement_total: splitReimbursements[index],
        })),
    };
}