import { jsonError, jsonOk, serverError } from "@/lib/api/apiUtils";
import { withUser } from "@/lib/api/withUser";
import db from "@/lib/db";
import { getTimesheetAccess, validateTimeEntryCreatePayload } from "@/lib/timesheets/timesheets";
import { TimeEntryCreatePayload } from "@/types/timesheets";

type Params = Promise<{
    id: string;
}>;

export const POST = withUser<Params>(async (req, context, user) => {
    try {
        const { id } = await context.params!;

        if (!id || typeof id !== "string") {
            return jsonError("Invalid timesheet ID.", 400);
        }

        const access = await getTimesheetAccess(id, user.id);

        if (!access.canEdit) return jsonError("Timesheet not found.", 404);

        const timesheetResult = await db.query(
            `
                SELECT
                    id,
                    user_id,
                    period_start,
                    period_end,
                    status
                FROM timesheets
                WHERE id = $1
                    AND user_id = $2
            `,
            [id, user.id]
        );

        if (timesheetResult.length === 0) return jsonError("Timesheet not found.", 404);

        const timesheet = timesheetResult[0];

        if (timesheet.status === "finalized") {
            return jsonError("Finalized timesheets cannot be edited.", 400);
        }

        const body = (await req.json()) as TimeEntryCreatePayload;
        const validated = validateTimeEntryCreatePayload(body);

        if (
            validated.workDate < timesheet.period_start ||
            validated.workDate > timesheet.period_end
        ) {
            return jsonError("Entry date must be within the timesheet period.", 400);
        }

        const result = await db.query(
            `
                INSERT INTO time_entries (
                    timesheet_id,
                    user_id,
                    work_date,
                    start_time,
                    end_time,
                    duration_minutes,
                    category,
                    description,
                    updated_at
                )
                VALUES (
                    $1, $2, $3, $4, $5,
                    $6, $7, $8, NOW()
                )
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
                id,
                user.id,
                validated.workDate,
                validated.startTime,
                validated.endTime,
                validated.durationMinutes,
                validated.category,
                validated.description,
            ]
        );

        if (result.length === 0) return jsonError("Time entry was not created.", 400);

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

        return serverError("POST /api/timesheets/[id]/entries", err);
    }
});