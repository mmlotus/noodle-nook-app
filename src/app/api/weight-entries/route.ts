import db from "@/lib/db";
import { withUser } from "@/lib/api/withUser";
import { jsonError, jsonOk, serverError } from "@/lib/api/apiUtils";

export const GET = withUser(async (_req, _context, user) => {
    try {
        const result = await db.query(
            `
                SELECT
                    id,
                    user_id,
                    entry_date,
                    weight_lb,
                    notes,
                    created_at,
                    updated_at
                FROM weight_entries
                WHERE user_id = $1
                ORDER BY entry_date ASC
            `,
            [user.id]
        );

        return jsonOk({ entries: result });
    } catch (err) {
        return serverError("GET /api/weight-entries", err);
    }
});

export const POST = withUser(async (req, _context, user) => {
    try {
        const { entry_date, weight_lb, notes } = await req.json();

        if (!entry_date || typeof entry_date !== "string") {
            return jsonError("Invalid entry date", 400);
        }

        if (
            typeof weight_lb !== "number" ||
            !Number.isFinite(weight_lb) ||
            weight_lb <= 0
        ) {
            return jsonError("Invalid weight", 400);
        }

        const result = await db.query(
            `
                INSERT INTO weight_entries (
                    user_id,
                    entry_date,
                    weight_lb,
                    notes,
                    updated_at
                )
                VALUES (
                    $1, $2, $3, $4, NOW()
                )
                ON CONFLICT (user_id, entry_date)
                DO UPDATE SET
                    weight_lb = EXCLUDED.weight_lb,
                    notes = EXCLUDED.notes,
                    updated_at = NOW()
                RETURNING
                    id,
                    user_id,
                    entry_date,
                    weight_lb,
                    notes,
                    created_at,
                    updated_at
            `,
            [
                user.id,
                entry_date,
                weight_lb,
                typeof notes === "string" && notes.trim() ? notes.trim() : null,
            ]
        );

        if (result.length === 0) return jsonError("User not found", 404);

        return jsonOk({ success: true, entry: result[0] });
    } catch (err) {
        return serverError("POST /api/weight-entries", err);
    }
});

export const DELETE = withUser(async (req, _context, user) => {
    try {
        const { entry_date } = await req.json();

        if (!entry_date || typeof entry_date !== "string") {
            return jsonError("Invalid entry date", 400);
        }

        await db.query(
            `
                DELETE FROM weight_entries
                WHERE user_id = $1
                  AND entry_date = $2
            `,
            [user.id, entry_date]
        );

        return jsonOk({ success: true });
    } catch (err) {
        return serverError("DELETE /api/weight-entries", err);
    }
});