import { jsonError, jsonOk, serverError } from "@/lib/api/apiUtils";
import { withUser } from "@/lib/api/withUser";
import db from "@/lib/db";
import { getTimesheetAccess, validateTimesheetUpdatePayload } from "@/lib/timesheets/timesheets";
import { TimesheetUpdatePayload } from "@/types/timesheets";

type Params = Promise<{
    id: string;
}>;

export const GET = withUser<Params>(async (_req, context, user) => {
    try {
        const { id } = await context.params!;

        if (!id || typeof id !== "string") {
            return jsonError("Invalid timesheet ID.", 400);
        }

        const access = await getTimesheetAccess(id, user.id);

        if (!access.canView) {
            return jsonError("Timesheet not found.", 404);
        }

        const timesheetResult = await db.query(
            `
                SELECT
                    t.id,
                    t.user_id,
                    u.name AS user_name,
                    u.email AS user_email,
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
                JOIN users u
                    ON u.id = t.user_id
                LEFT JOIN time_entries te
                    ON te.timesheet_id = t.id
                WHERE t.id = $1
                GROUP BY
                    t.id,
                    u.name,
                    u.email
            `,
            [id]
        );

        if (timesheetResult.length === 0) {
            return jsonError("Timesheet not found.", 404);
        }

        const entries = await db.query(
            `
                SELECT
                    id,
                    timesheet_id,
                    user_id,
                    work_date,
                    start_time,
                    end_time,
                    duration_minutes,
                    category,
                    description,
                    created_at,
                    updated_at
                FROM time_entries
                WHERE timesheet_id = $1
                ORDER BY work_date ASC, start_time ASC NULLS LAST, created_at ASC
            `,
            [id]
        );

        return jsonOk({
            timesheet: timesheetResult[0],
            entries,
            access,
        });
    } catch (err) {
        return serverError("GET /api/timesheets/[id]", err);
    }
});

export const PATCH = withUser<Params>(async (req, context, user) => {
    try {
        const { id } = await context.params!;

        if (!id || typeof id !== "string") {
            return jsonError("Invalid timesheet ID.", 400);
        }

        const access = await getTimesheetAccess(id, user.id);

        if (!access.canEdit) {
            return jsonError("Timesheet not found.", 404);
        }

        const existingResult = await db.query(
            `
                SELECT
                    status,
                    is_payable,
                    hourly_rate,
                    is_paid
                FROM timesheets
                WHERE id = $1
                    AND user_id = $2
            `,
            [id, user.id]
        );

        if (existingResult.length === 0) {
            return jsonError("Timesheet not found.", 404);
        }

        if (existingResult[0].is_paid) {
            return jsonError("Paid timesheets cannot be edited.", 400);
        }

        const body = (await req.json()) as TimesheetUpdatePayload;
        const validated = validateTimesheetUpdatePayload(body);

        const notesWasProvided = Object.prototype.hasOwnProperty.call(body, "notes");

        const result = await db.query(
            `
                UPDATE timesheets
                SET
                    period_start = COALESCE($1, period_start),
                    period_end = COALESCE($2, period_end),
                    status = COALESCE($3, status),
                    notes = CASE
                        WHEN $4::boolean THEN $5
                        ELSE notes
                    END,
                    is_payable = CASE
                        WHEN $6::boolean THEN $7::boolean
                        ELSE is_payable
                    END,
                    hourly_rate = CASE
                        WHEN $8::boolean THEN $9::numeric
                        ELSE hourly_rate
                    END,
                    is_paid = CASE
                        WHEN $10::boolean THEN $11::boolean
                        ELSE is_paid
                    END,
                    paid_at = CASE
                        WHEN $10::boolean AND $11::boolean THEN NOW()
                        WHEN $10::boolean AND $11::boolean = false THEN NULL
                        ELSE paid_at
                    END,
                    updated_at = NOW()
                WHERE id = $12
                    AND user_id = $13
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
                validated.periodStart ?? null,
                validated.periodEnd ?? null,
                validated.status ?? null,
                notesWasProvided,
                validated.notes ?? null,
                validated.hasIsPayable,
                validated.isPayable ?? false,
                validated.hasHourlyRate,
                validated.hourlyRate ?? null,
                validated.hasIsPaid,
                validated.isPaid ?? false,
                id,
                user.id,
            ]
        );

        if (result.length === 0) {
            return jsonError("Timesheet not found.", 404);
        }

        return jsonOk({ success: true, timesheet: result[0] });
    } catch (err) {
        const code = typeof err === "object" && err !== null && "code" in err
            ? String((err as { code?: unknown }).code)
            : "";

        if (code === "23505") {
            return jsonError("A timesheet already exists for this date range.", 400);
        }

        if (err instanceof Error) return jsonError(err.message, 400);

        return serverError("PATCH /api/timesheets/[id]", err);
    }
});

export const DELETE = withUser<Params>(async (_req, context, user) => {
    try {
        const { id } = await context.params!;

        if (!id || typeof id !== "string") {
            return jsonError("Invalid timesheet ID.", 400);
        }

        const access = await getTimesheetAccess(id, user.id);

        if (!access.canEdit) return jsonError("Timesheet not found.", 404);

        const existingResult = await db.query(
            `
                SELECT status
                FROM timesheets
                WHERE id = $1
                    AND user_id = $2
            `,
            [id, user.id]
        );

        if (existingResult.length === 0) return jsonError("Timesheet not found.", 404);

        if (existingResult[0].status === "finalized") return jsonError("Finalized timesheets cannot be deleted.", 400);

        await db.query(
            `
            DELETE FROM timesheets
            WHERE id = $1
                AND user_id = $2
        `,
            [id, user.id]
        );

        return jsonOk({ success: true });
    } catch (err) {
        return serverError("DELETE /api/timesheets/[id]", err);
    }
});