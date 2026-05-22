import { cleanText } from "@/app/utils/parse";
import { MILEAGE_LLCS, MileageCreatePayload, MileageLlc, ValidatedMileagePayload } from "@/types/mileage";

function isMileageLlc(value: unknown): value is MileageLlc {
    return (
        typeof value === "string" &&
        MILEAGE_LLCS.includes(value as MileageLlc)
    );
}

function normalizeMileageLlcs(value: unknown): MileageLlc[] {
    if (!Array.isArray(value)) {
        return [];
    }

    const llcs: MileageLlc[] = [];

    for (const item of value) {
        if (!isMileageLlc(item)) {
            throw new Error(`Invalid mileage LLC: ${String(item)}`);
        }

        if (!llcs.includes(item)) {
            llcs.push(item);
        }
    }

    return llcs;
}

export function validateMileagePayload(
    body: MileageCreatePayload
): ValidatedMileagePayload {
    const startDate = cleanText(body.start_date);
    const endDate = cleanText(body.end_date);
    const purpose = cleanText(body.purpose);

    if (!startDate) {
        throw new Error("Start date is required.");
    }

    if (!endDate) {
        throw new Error("End date is required.");
    }

    if (new Date(endDate) < new Date(startDate)) {
        throw new Error("End date cannot be before start date.");
    }

    if (!purpose) {
        throw new Error("Purpose is required.");
    }

    const mileageLlcs = normalizeMileageLlcs(body.mileage_llcs);
    const storeIds = cleanText(body.store_ids);

    return {
        startDate,
        endDate,
        purpose,
        org: cleanText(body.org),
        startLocation: cleanText(body.start_location),
        endLocation: cleanText(body.end_location),
        stops: cleanText(body.stops),
        notes: cleanText(body.notes),
        mileageLlcs,
        storeIds,
    };
}