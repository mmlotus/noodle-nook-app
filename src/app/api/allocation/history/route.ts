import { jsonOk, serverError } from "@/lib/api/apiUtils";
import { withUser } from "@/lib/api/withUser";
import db from "@/lib/db";

export const GET = withUser(async (_req, _context, user) => {
    try {
        const history = await db.query(
            `
                SELECT
                    id,
                    preset_id AS "presetId",
                    preset_name AS "presetName",
                    source_account_name AS "sourceAccountName",
                    amount_to_allocate::float AS "amountToAllocate",
                    total_allocated::float AS "totalAllocated",
                    amount_remaining::float AS "amountRemaining",
                    results,
                    created_at AS "createdAt"
                FROM allocation_calculations
                WHERE user_id = $1
                ORDER BY created_at DESC, id DESC
                LIMIT 50
            `,
            [user.id]
        );

        return jsonOk({ history });
    } catch (err) {
        return serverError("GET /api/allocation/history", err);
    }
});