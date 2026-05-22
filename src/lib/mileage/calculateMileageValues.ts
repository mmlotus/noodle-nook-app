import { toNumber } from "@/app/utils/parse";
import { CalculatedMileageValues, MileageCreatePayload } from "@/types/mileage";


export function calculateMileageValues(
    body: MileageCreatePayload
): CalculatedMileageValues {
    const entryMethod = body.entry_method;

    if (entryMethod !== "total_miles" && entryMethod !== "odometer") {
        throw new Error("Invalid mileage entry method.");
    }

    const startOdometer = toNumber(body.start_odometer);
    const endOdometer = toNumber(body.end_odometer);

    if (entryMethod === "total_miles") {
        const totalMiles = toNumber(body.total_miles);

        if (totalMiles === null || totalMiles <= 0) {
            throw new Error("Total miles must be greater than 0.");
        }

        return {
            entryMethod,
            totalMiles: Number(totalMiles.toFixed(2)),
            startOdometer: null,
            endOdometer: null,
        };
    }

    if (startOdometer === null || endOdometer === null) {
        throw new Error("Start & end odometer readings are required.");
    }

    if (endOdometer <= startOdometer) {
        throw new Error("End odometer reading must be greater than start odometer reading.");
    }

    return {
        entryMethod,
        totalMiles: Number((endOdometer - startOdometer).toFixed(2)),
        startOdometer,
        endOdometer,
    };
}