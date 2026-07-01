import { jsonError, jsonOk, serverError } from "@/lib/api/apiUtils";
import { withUser } from "@/lib/api/withUser";
import db from "@/lib/db";
import { getTimesheetAccess } from "@/lib/timesheets/timesheets";

type Params = Promise<{
    id: string;
    userId: string;
}>;

export const DELETE = withUser<Params>(async (_req, context, user) => {
    try {
        const { id, userId } = await context.params!;

        if (!id || typeof id !== "string") return jsonError("Invalid timesheet ID.", 400);

        if (!userId || typeof userId !== "string") return jsonError("Invalid user ID.", 400);

        const access = await getTimesheetAccess(id, user.id);

        if (!access.canShare) return jsonError("Timesheet not found.", 404);

        if (userId === user.id) return jsonError("You cannot remove yourself from your own timesheet.", 400);

        const result = await db.query(
            `
                DELETE FROM timesheet_shares
                WHERE timesheet_id = $1
                    AND shared_with_user_id = $2
                RETURNING id
            `,
            [id, userId]
        );
        
        if (result.length === 0) return jsonError("Shared user not found.", 404);

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
        return serverError("DELETE /api/timesheets/[id]/share/[userId]", err);
    }
});