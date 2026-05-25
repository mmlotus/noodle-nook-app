import { jsonError, jsonOk, serverError } from "@/lib/api/apiUtils";
import { withUser } from "@/lib/api/withUser";
import db from "@/lib/db";
import { calculateMileageValues, calculateReimbursement, validateMileagePayload } from "@/lib/mileage";
import { MileageCreatePayload, MileageUpdatePayload } from "@/types/mileage";

export const GET = withUser(async (_req, _context, user) => {
    try {
        const result = await db.query(
            `
                SELECT
                    id,
                    user_id,
                    start_date,
                    end_date,
                    entry_method,
                    total_miles,
                    start_odometer,
                    end_odometer,
                    start_location,
                    end_location,
                    stops,
                    purpose,
                    notes,
                    reimbursement_rate,
                    reimbursement_total,
                    created_at,
                    updated_at
                FROM mileage_entries
                WHERE user_id = $1
                ORDER BY start_date DESC, created_at DESC
            `,
            [user.id]
        );

        return jsonOk({ entries: result });
    } catch (err) {
        return serverError("GET /api/mileage", err);
    }
});

export const POST = withUser(async (req, _context, user) => {
    try {
        const body = (await req.json()) as MileageCreatePayload;

        const validated = validateMileagePayload(body);
        const mileageValues = calculateMileageValues(body);

        const reimbursement = calculateReimbursement({
            totalMiles: mileageValues.totalMiles,
            reimbursementRate: body.reimbursement_rate,
            startDate: validated.startDate,
        });

        const result = await db.query(
            `
                INSERT INTO mileage_entries (
                    user_id,
                    start_date,
                    end_date,
                    entry_method,
                    total_miles,
                    start_odometer,
                    end_odometer,
                    start_location,
                    end_location,
                    stops,
                    purpose,
                    notes,
                    reimbursement_rate,
                    reimbursement_total,
                    updated_at
                )
                VALUES (
                    $1, $2, $3, $4, $5,
                    $6, $7, $8, $9, $10,
                    $11, $12, $13, $14, NOW()
                )
                RETURNING
                    id,
                    user_id,
                    start_date,
                    end_date,
                    entry_method,
                    total_miles,
                    start_odometer,
                    end_odometer,
                    start_location,
                    end_location,
                    stops,
                    purpose,
                    notes,
                    reimbursement_rate,
                    reimbursement_total,
                    created_at,
                    updated_at
            `,
            [
                user.id,
                validated.startDate,
                validated.endDate,
                mileageValues.entryMethod,
                mileageValues.totalMiles,
                mileageValues.startOdometer,
                mileageValues.endOdometer,
                validated.startLocation,
                validated.endLocation,
                validated.stops,
                validated.purpose,
                validated.notes,
                reimbursement.reimbursementRate,
                reimbursement.reimbursementTotal,
            ]
        );

        if (result.length === 0) {
            return jsonError("Mileage entry was not created.", 400);
        }

        return jsonOk({ success: true, entry: result[0] });
    } catch (err) {
        return serverError("POST /api/mileage", err);
    }
});

export const PATCH = withUser(async (req, _context, user) => {
    try {
        const body = (await req.json()) as MileageUpdatePayload;

        if (!body.id || typeof body.id !== "string") {
            return jsonError("Invalid mileage entry ID.", 400);
        }

        const validated = validateMileagePayload(body);
        const mileageValues = calculateMileageValues(body);

        const reimbursement = calculateReimbursement({
            totalMiles: mileageValues.totalMiles,
            reimbursementRate: body.reimbursement_rate,
            startDate: validated.startDate,
        });

        const result = await db.query(
            `
                UPDATE mileage_entries
                SET
                    start_date = $1,
                    end_date = $2,
                    entry_method = $3,
                    total_miles = $4,
                    start_odometer = $5,
                    end_odometer = $6,
                    start_location = $7,
                    end_location = $8,
                    stops = $9,
                    purpose = $10,
                    notes = $11,
                    reimbursement_rate = $12,
                    reimbursement_total = $13,
                    updated_at = NOW()
                WHERE id = $14
                    AND user_id = $15
                RETURNING
                    id,
                    user_id,
                    start_date,
                    end_date,
                    entry_method,
                    total_miles,
                    start_odometer,
                    end_odometer,
                    start_location,
                    end_location,
                    stops,
                    purpose,
                    notes,
                    reimbursement_rate,
                    reimbursement_total,
                    created_at,
                    updated_at
            `,
            [
                validated.startDate,
                validated.endDate,
                mileageValues.entryMethod,
                mileageValues.totalMiles,
                mileageValues.startOdometer,
                mileageValues.endOdometer,
                validated.startLocation,
                validated.endLocation,
                validated.stops,
                validated.purpose,
                validated.notes,
                reimbursement.reimbursementRate,
                reimbursement.reimbursementTotal,
                body.id,
                user.id,
            ]
        );

        if (result.length === 0) {
            return jsonError("Mileage entry not found.", 404);
        }

        return jsonOk({ success: true, entry: result[0] });
    } catch (err) {
        return serverError("PATCH /api/mileage", err);
    }
});

export const DELETE = withUser(async (req, _context, user) => {
    try {
        const { id } = await req.json();

        if (!id || typeof id !== "string") {
            return jsonError("Invalid mileage entry ID", 400);
        }

        await db.query(
            `
                DELETE FROM mileage_entries
                WHERE id = $1
                    AND user_id = $2
            `,
            [id, user.id]
        );

        return jsonOk({ success: true });
    } catch (err) {
        return serverError("DELETE /api/mileage", err);
    }
})