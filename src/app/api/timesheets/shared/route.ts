import { jsonOk, serverError } from "@/lib/api/apiUtils";
import { withUser } from "@/lib/api/withUser";
import db from "@/lib/db";

export const GET = withUser(async (_req, _context, user) => {
    try {
        const result = await db.query(
            `
                SELECT
                    t.id,
                    t.user_id,
                    owner.name AS owner_name,
                    owner.email AS owner_email,
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
                    ts.permission,
                    ts.created_at AS shared_at,
                    COALESCE(SUM(te.duration_minutes), 0) AS total_minutes,
                    COUNT(te.id) AS entry_count
                FROM timesheet_shares ts
                JOIN timesheets t
                    ON t.id = ts.timesheet_id
                JOIN users owner
                    ON owner.id = t.user_id
                LEFT JOIN time_entries te
                    ON te.timesheet_id = t.id
                WHERE ts.shared_with_user_id = $1
                GROUP BY
                    t.id,
                    owner.name,
                    owner.email,
                    ts.permission,
                    ts.created_at
                ORDER BY ts.created_at DESC, t.period_start DESC
            `,
            [user.id]
        );

        return jsonOk({ timesheets: result });
    } catch (err) {
        return serverError("GET /api/timesheets/shared", err);
    }
});