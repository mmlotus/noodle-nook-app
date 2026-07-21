import { getCurrentTimeString, getMinutesBetweenTimes, getTodayDateString } from "@/app/utils/formatDate";
import { jsonError, jsonOk, serverError } from "@/lib/api/apiUtils";
import { withUser } from "@/lib/api/withUser";
import db from "@/lib/db";
import { getTimesheetAccess } from "@/lib/timesheets/timesheets";
import { LiveClockInPayload, LiveClockOutPayload } from "@/types/timesheets";

type Params = Promise<{
    id: string;
}>;

export const POST = withUser<Params>(async (req, context, user) => {
    try {
        const { id } = await context.params!;

        if (!id || typeof id !== "string") return jsonError("Invalid timesheet ID.", 400);

        const access = await getTimesheetAccess(id, user.id);

        if (!access.canEdit) return jsonError("Timesheet not found.", 404);

        const body = (await req.json()) as LiveClockInPayload;

        const category = body.category?.trim();
        const description = body.description?.trim() || null;

        if (!category) return jsonError("Category is required.", 400);

        const timesheetResult = await db.query(
            `
                SELECT
                    id,
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

        if (timesheet.status !== "open") return jsonError("Only open timesheets can be edited.", 400);

        const workDate = getTodayDateString();
        const startTime = getCurrentTimeString();

        if (workDate < timesheet.period_start || workDate > timesheet.period_end) {
            return jsonError("Today's date is outside this timesheet period.", 400);
        }

        const activeResult = await db.query(
            `
                SELECT id
                FROM time_entries
                WHERE user_id = $1
                    AND end_time IS NULL
                LIMIT 1
            `,
            [user.id]
        );

        if (activeResult.length > 0) return jsonError("You are already clocked in!", 400);

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
                    $1, $2, $3, $4, NULL,
                    NULL, $5, $6, NOW()
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
                workDate,
                startTime,
                category,
                description,
            ]
        );

        if (result.length === 0) return jsonError("Could not clock in.", 400);

        await db.query(
            `
                UPDATE timesheets
                SET updated_at = NOW()
                WHERE id = $1
                    AND user_id = $2
            `,
            [id, user.id]
        );

        return jsonOk({
            success: true,
            entry: result[0],
        });
    } catch (err) {
        if (
            err instanceof Error && err.message.includes("time_entries_one_active_per_user")
        ) {
            return jsonError("You are already clocked in.", 400);
        }

        return serverError("POST /api/timesheets/[id]/clock", err);
    }
});

export const PATCH = withUser<Params>(async (req, context, user) => {
    try {
        const { id } = await context.params!;

        if (!id || typeof id !== "string") return jsonError("Invalid timesheet ID.", 400);

        const access = await getTimesheetAccess(id, user.id);

        if (!access.canEdit) return jsonError("Timesheet not found.", 404);

        const body = (await req.json()) as LiveClockOutPayload;

        if (!body.entry_id || typeof body.entry_id !== "string") return jsonError("Invalid time entry ID.", 400);

        const activeResult = await db.query(
            `
                SELECT
                    id,
                    start_time
                FROM time_entries
                WHERE id = $1
                    AND timesheet_id = $2
                    AND user_id = $3
                    AND end_time IS NULL
            `,
            [body.entry_id, id, user.id]
        );

        if (activeResult.length === 0) return jsonError("Active time entry not found.", 404);

        const endTime = getCurrentTimeString();

        const durationMinutes = getMinutesBetweenTimes(activeResult[0].start_time, endTime);

        if (durationMinutes <= 0) return jsonError("Clock-out time must be after clock-in time.", 400);

        const result = await db.query(
            `
                UPDATE time_entries
                SET
                    end_time = $1,
                    duration_minutes = $2,
                    updated_at = NOW()
                WHERE id = $3
                    AND timesheet_id = $4
                    AND user_id = $5
                    AND end_time IS NULL
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
                endTime,
                durationMinutes,
                body.entry_id,
                id,
                user.id,
            ]
        );

        if (result.length === 0) return jsonError("Could not clock out.", 400);

        await db.query(
            `
                UPDATE timesheets
                SET updated_at = NOW()
                WHERE id = $1
                    AND user_id = $2
            `,
            [id, user.id]
        );

        return jsonOk({
            success: true,
            entry: result[0],
        });
    } catch (err) {
        return serverError("PATCH /api/timesheets/[id]/clock", err);
    }
});