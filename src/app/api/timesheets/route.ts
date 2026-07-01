import { jsonError, jsonOk, serverError } from "@/lib/api/apiUtils";
import { withUser } from "@/lib/api/withUser";
import db from "@/lib/db";
import { validateTimesheetCreatePayload } from "@/lib/timesheets/timesheets";
import { TimesheetCreatePayload } from "@/types/timesheets";

export const GET = withUser(async (_req, _context, user) => {
    try {
        const result = await db.query(
            `
                SELECT
                    t.id,
                    t.user_id,
                    t.period_start,
                    t.period_end,
                    t.status,
                    t.notes,
                    t.is_payable,
                    t.hourly_rate,
                    t.is_paid,
                    t.paid_at,
                    t.created_at,
                    t.updated_at,
                    COALESCE(SUM(te.duration_minutes), 0) AS total_minutes,
                    COUNT(te.id) AS entry_count
                FROM timesheets t
                LEFT JOIN time_entries te
                    ON te.timesheet_id = t.id
                WHERE t.user_id = $1
                GROUP BY t.id
                ORDER BY t.period_start DESC, t.created_at DESC
            `,
            [user.id]
        );

        return jsonOk({ timesheets: result });
    } catch (err) {
        return serverError("GET /api/timesheets", err);
    }
});

export const POST = withUser(async (req, _context, user) => {
    try {
        const body = (await req.json()) as TimesheetCreatePayload;
        const validated = validateTimesheetCreatePayload(body);

        const result = await db.query(
            `
                INSERT INTO timesheets (
                    user_id,
                    period_start,
                    period_end,
                    notes,
                    is_payable,
                    hourly_rate,
                    updated_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, NOW())
                ON CONFLICT (user_id, period_start, period_end)
                DO UPDATE SET
                    updated_at = timesheets.updated_at
                RETURNING
                    id,
                    user_id,
                    period_start,
                    period_end,
                    status,
                    notes,
                    is_payable,
                    hourly_rate,
                    is_paid,
                    paid_at,
                    created_at,
                    updated_at
            `,
            [
                user.id,
                validated.periodStart,
                validated.periodEnd,
                validated.notes,
                validated.isPayable,
                validated.hourlyRate,
            ]
        );

        if (result.length === 0) {
            return jsonError("Timesheet was not created.", 400);
        }

        return jsonOk({ success: true, timesheet: result[0] });
    } catch (err) {
        if (err instanceof Error) {
            return jsonError(err.message, 400);
        }

        return serverError("POST /api/timesheets", err);
    }
});