import { cleanText } from "@/app/utils/parse";
import { MileageCreatePayload, ValidatedMileagePayload } from "@/types/mileage";

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

    return {
        startDate,
        endDate,
        purpose,
        startLocation: cleanText(body.start_location),
        endLocation: cleanText(body.end_location),
        stops: cleanText(body.stops),
        notes: cleanText(body.notes),
    };
}