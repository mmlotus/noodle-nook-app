import { jsonOk, serverError } from "@/lib/api/apiUtils";
import { withUser } from "@/lib/api/withUser";
import db from "@/lib/db";

export const GET = withUser(async (req, _context, user) => {
    try {
        const { searchParams } = new URL(req.url);
        const q = searchParams.get("q")?.trim() || "";

        if (q.length < 2) return jsonOk({ users: [] });

        const result = await db.query(
            `
                SELECT
                    id,
                    name,
                    email
                FROM users
                WHERE id <> $1
                    AND (
                        name ILIKE $2
                        OR email ILIKE $2
                    )
                ORDER BY
                    name ASC NULLS LAST,
                    email ASC
                LIMIT 20
            `,
            [user.id, `%${q}%`]
        );

        return jsonOk({ users: result });
    } catch (err) {
        return serverError("GET /api/timesheets/share-users", err);
    }
});