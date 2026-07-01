import { jsonError, jsonOk, serverError } from "@/lib/api/apiUtils";
import { withUser } from "@/lib/api/withUser";
import db from "@/lib/db";
import { getTimesheetAccess, validateTimeEntryUpdatePayload } from "@/lib/timesheets/timesheets";
import { TimeEntryUpdatePayload } from "@/types/timesheets";

type Params = Promise<{
    id: string;
    entryId: string;
}>;

export const PATCH = withUser<Params>(async (req, context, user) => {
    try {
        const { id, entryId } = await context.params!;

        if (!id || typeof id !== "string") return jsonError("Invalid timesheet ID.", 400);

        if (!entryId || typeof entryId !== "string") return jsonError("Invalid time entry ID.", 400);

        const access = await getTimesheetAccess(id, user.id);

        if (!access.canEdit) return jsonError("Time entry not found.", 404);

        const existingResult = await db.query(
            `
                SELECT
                    te.id,
                    te.timesheet_id,
                    te.user_id,
                    t.period_start,
                    t.period_end,
                    t.status
                FROM time_entries te
                JOIN timesheets t
                    ON t.id = te.timesheet_id
                WHERE te.id = $1
                    AND te.timesheet_id = $2
                    AND te.user_id = $3
                    AND t.user_id = $3
            `,
            [entryId, id, user.id]
        );

        if (existingResult.length === 0) return jsonError("Time entry not found.", 404);

        const existing = existingResult[0];

        if (existing.status === "finalized") return jsonError("Finalized timesheets cannot be edited.", 400);

        const body = (await req.json()) as TimeEntryUpdatePayload;
        const validated = validateTimeEntryUpdatePayload(body);

        if (validated.workDate && (validated.workDate < existing.period_start || validated.workDate > existing.period_end)) {
            return jsonError("Entry date must be within the timesheet period.", 400);
        }

        const result = await db.query(
            `
                UPDATE time_entries
                SET
                    work_date = COALESCE($1, work_date),
                    start_time = CASE
                        WHEN $2::boolean THEN $3::time
                        ELSE start_time
                    END,
                    end_time = CASE
                        WHEN $4::boolean THEN $5::time
                        ELSE end_time
                    END,
                    duration_minutes = COALESCE($6, duration_minutes),
                    category = COALESCE($7, category),
                    description = CASE
                        WHEN $8::boolean THEN $9
                        ELSE description
                    END,
                    updated_at = NOW()
                WHERE id = $10
                    AND timesheet_id = $11
                    AND user_id = $12
                RETURNING
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
            `,
            [
                validated.workDate ?? null,
                Object.prototype.hasOwnProperty.call(body, "start_time"),
                validated.startTime ?? null,
                Object.prototype.hasOwnProperty.call(body, "end_time"),
                validated.endTime ?? null,
                validated.durationMinutes ?? null,
                validated.category ?? null,
                Object.prototype.hasOwnProperty.call(body, "description"),
                validated.description ?? null,
                entryId,
                id,
                user.id,
            ]
        );

        if (result.length === 0) return jsonError("Time entry not found.", 404);

        await db.query(
            `
                UPDATE timesheets
                SET updated_at = NOW()
                WHERE id = $1
                    AND user_id = $2
            `,
            [id, user.id]
        );

        return jsonOk({ success: true, entry: result[0] });
    } catch (err) {
        if (err instanceof Error) return jsonError(err.message, 400);

        return serverError("PATCH /api/timesheets/[id]/entries/[entryId]", err);
    }
});

export const DELETE = withUser<Params>(async (_req, context, user) => {
    try {
        const { id, entryId } = await context.params!;

        if (!id || typeof id !== "string") return jsonError("Invalid timesheet ID.", 400);

        if (!entryId || typeof entryId !== "string") return jsonError("Invalid time entry ID.", 400);

        const access = await getTimesheetAccess(id, user.id);

        if (!access.canEdit) return jsonError("Time entry not found.", 404);

        const existingResult = await db.query(
            `
                SELECT
                    te.id,
                    t.status
                FROM time_entries te
                JOIN timesheets t
                    ON t.id = te.timesheet_id
                WHERE te.id = $1
                    AND te.timesheet_id = $2
                    AND te.user_id = $3
                    AND t.user_id = $3
            `,
            [entryId, id, user.id]
        );

        if (existingResult.length === 0) return jsonError("Time entry not found.", 404);

        if (existingResult[0].status === "finalized") return jsonError("Finalized timesheets cannot be edited.", 400);

        await db.query(
            `
                DELETE FROM time_entries
                WHERE id = $1
                    AND timesheet_id = $2
                    AND user_id = $3
            `,
            [entryId, id, user.id]
        );

        await db.query(
            `
                UPDATE timesheets
                SET updated_at = NOW()
                WHERE id = $1
                    AND user_id = $2
            `,
            [id, user.id]
        );

        return jsonOk({ success: true });
    } catch (err) {
        return serverError("DELETE /api/timesheets/[id]/entries/[entryId]", err);
    }
});