import { cleanString, jsonError, jsonOk, serverError } from "@/lib/api/apiUtils";
import { withUser } from "@/lib/api/withUser";
import db from "@/lib/db";

export const GET = withUser(async (_req, _context, user) => {
    try {
        const accounts = await db.query(
            `
                SELECT
                    id,
                    name,
                    created_at AS "createdAt"
                FROM allocation_accounts
                WHERE user_id = $1
                ORDER BY LOWER(name) ASC
            `,
            [user.id]
        );

        return jsonOk({ accounts });
    } catch (err) {
        return serverError("GET /api/allocation/accounts", err);
    }
});

export const POST = withUser(async (req, _context, user) => {
    try {
        const body = await req.json();
        const name = cleanString(body.name);

        if (!name) return jsonError("Account name is required.", 400);

        const existing = await db.query(
            `
                SELECT id
                FROM allocation_accounts
                WHERE user_id = $1
                AND LOWER(name) = LOWER($2)
                LIMIT 1
            `,
            [user.id, name]
        );

        if (existing.length > 0) return jsonError("You already have an account with that name.", 409);

        const result = await db.query(
            `
                INSERT INTO allocation_accounts (
                    user_id,
                    name
                )
                VALUES ($1, $2)
                RETURNING
                    id,
                    name,
                    created_at AS "createdAt"
            `,
            [user.id, name]
        );

        return jsonOk({
            success: true,
            account: result[0]
        });
    } catch (err) {
        return serverError("POST /api/allocation/accounts", err);
    }
});