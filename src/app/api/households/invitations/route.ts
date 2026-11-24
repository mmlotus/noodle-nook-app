import { jsonOk, serverError } from "@/lib/api/apiUtils";
import { withUser } from "@/lib/api/withUser";
import db from "@/lib/db";

export const GET = withUser(async (_req, _context, user) => {
    try {
        const result = await db.query(
            `
                SELECT
                    hi.*,
                    h.name AS household_name,
                    u.name AS invited_by_name
                FROM household_invitations hi
                INNER JOIN households h
                    ON h.id = hi.household_id
                INNER JOIN users u
                    ON u.id = hi.invited_by_user_id
                WHERE hi.invited_user_id = $1
                    AND hi.status = 'pending'
                ORDER BY hi.created_at DESC
            `,
            [user.id]
        );

        return jsonOk({ invitations: result });
    } catch (err) {
        return serverError("GET /api/households/invitations", err);
    }
});