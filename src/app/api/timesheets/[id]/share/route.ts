import { jsonError, jsonOk, serverError } from "@/lib/api/apiUtils";
import { withUser } from "@/lib/api/withUser";
import db from "@/lib/db";
import { getTimesheetAccess, validateTimesheetPermission } from "@/lib/timesheets/timesheets";
import { TimesheetShareCreatePayload } from "@/types/timesheets";

type Params = Promise<{
    id: string;
}>;

export const GET = withUser<Params>(async (_req, context, user) => {
    try {
        const { id } = await context.params!;

        if (!id || typeof id !== "string") return jsonError("Invalid timesheet ID.", 400);

        const access = await getTimesheetAccess(id, user.id);

        if (!access.canShare) return jsonError("Timesheet not found.", 404);

        const shares = await db.query(
            `
                SELECT
                    ts.id,
                    ts.timesheet_id,
                    ts.shared_with_user_id,
                    u.name AS shared_with_name,
                    u.email AS shared_with_email,
                    ts.shared_by_user_id,
                    ts.permission,
                    ts.created_at
                FROM timesheet_shares ts
                JOIN users u
                    ON u.id = ts.shared_with_user_id
                WHERE ts.timesheet_id = $1
                ORDER BY u.name ASC, u.email ASC
            `,
            [id]
        );

        return jsonOk({ shares });
    } catch (err) {
        return serverError("GET /api/timesheets/[id]/share", err);
    }
});

export const POST = withUser<Params>(async (req, context, user) => {
    try {
        const { id } = await context.params!;

        if (!id || typeof id !== "string") return jsonError("Invalid timesheet ID.", 400);

        const access = await getTimesheetAccess(id, user.id);

        if (!access.canShare) return jsonError("Timesheet not found.", 404);

        const body = (await req.json()) as TimesheetShareCreatePayload;

        if (!body.user_id || typeof body.user_id !== "string") return jsonError("Invalid user ID.", 400);

        if (body.user_id === user.id) return jsonError("You cannot share a timesheet with yourself.", 400);

        const permission = validateTimesheetPermission(body.permission);

        const timesheetResult = await db.query(
            `
                SELECT id, user_id, status
                FROM timesheets
                WHERE id = $1
                    AND user_id = $2
            `,
            [id, user.id]
        );

        if (timesheetResult.length === 0) return jsonError("Timesheet not found.", 404);

        const userResult = await db.query(
            `
                SELECT id, name, email
                FROM users
                WHERE id = $1
            `,
            [body.user_id]
        );

        if (userResult.length === 0) return jsonError("That user does not have a NoodleNook account.", 404);

        const result = await db.query(
            `
                INSERT INTO timesheet_shares (
                    timesheet_id,
                    shared_with_user_id,
                    shared_by_user_id,
                    permission
                )
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (timesheet_id, shared_with_user_id)
                DO UPDATE SET
                    permission = EXCLUDED.permission
                RETURNING
                    id,
                    timesheet_id,
                    shared_with_user_id,
                    shared_by_user_id,
                    permission,
                    created_at
            `,
            [
                id,
                body.user_id,
                user.id,
                permission,
            ]
        );

        if (result.length === 0) return jsonError("Timesheet was not shared.", 400);

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
            share: {
                ...result[0],
                shared_with_name: userResult[0].name,
                shared_with_email: userResult[0].email,
            },
        });
    } catch (err) {
        if (err instanceof Error) return jsonError(err.message, 400);

        return serverError("POST /api/timesheets/[id]/share", err);
    }
});