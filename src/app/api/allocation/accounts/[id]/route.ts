import { cleanString, jsonError, jsonOk, serverError } from "@/lib/api/apiUtils";
import { withUser } from "@/lib/api/withUser";
import db from "@/lib/db";

type Params = Promise<{
    id: string;
}>;

export const PATCH = withUser<Params>(async (req, context, user) => {
    try {
        const { id } = await context.params!;
        const body = await req.json();
        const name = cleanString(body.name);

        if (!name) return jsonError("Account name is required.", 400);

        const account = await db.query(
            `
                SELECT id
                FROM allocation_accounts
                WHERE id = $1
                AND user_id = $2
                LIMIT 1
            `,
            [id, user.id]
        );

        if (account.length === 0) return jsonError("Account not found.", 400);

        const duplicate = await db.query(
            `
                SELECT id
                FROM allocation_accounts
                WHERE user_id = $1
                AND LOWER(name) = LOWER($2)
                AND id <> $3
                LIMIT 1
            `,
            [user.id, name, id]
        );

        if (duplicate.length > 0) return jsonError("You already have an account with that name.", 409);

        const result = await db.query(
            `
                UPDATE allocation_accounts
                SET name = $3
                WHERE id = $1
                AND user_id = $2
                RETURNING
                    id,
                    name,
                    created_at AS "createdAt"
            `,
            [id, user.id, name]
        );

        return jsonOk({ success: true, account: result[0] });
    } catch (err) {
        return serverError("PATCH /api/allocation/accounts/[id]", err);
    }
});

export const DELETE = withUser<Params>(async (_req, context, user) => {
    try {
        const { id } = await context.params!;

        const account = await db.query(
            `
                SELECT id
                FROM allocation_accounts
                WHERE id = $1
                ANd user_id = $2
                LIMIT 1
            `,
            [id, user.id]
        );

        if (account.length === 0) return jsonError("Account not found.", 404);

        const inUse = await db.query(
            `
                SELECT 1
                FROM allocation_presets p
                WHERE p.user_id = $1
                AND p.source_account_id = $2

                UNION ALL

                SELECT 1
                FROM allocation_rules r
                JOIN allocation_presets p
                    ON p.id = r.preset_id
                WHERE p.user_id = $1
                AND r.destination_account_id = $2

                LIMIT 1
            `,
            [user.id, id]
        );

        if (inUse.length > 0) return jsonError("This account is being used by a preset. Update or delete that preset first.", 409);

        await db.query(
            `
                DELETE FROM allocation_accounts
                WHERE id = $1
                AND user_id = $2
            `,
            [id, user.id]
        );

        return jsonOk({ success: true });
    } catch (err) {
        return serverError("DELETE /api/allocation/accounts/[id]", err);
    }
});