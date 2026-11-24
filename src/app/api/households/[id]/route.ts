import { cleanString, jsonError, jsonOk, serverError } from "@/lib/api/apiUtils";
import { withUser } from "@/lib/api/withUser";
import db from "@/lib/db";

export const GET = withUser<Promise<{ id: string }>>(
    async (_req, context, user) => {
        try {
            const params = await context.params;
            const id = params?.id;

            if (!id) return jsonError("Household ID is required.", 400);

            const households = await db.query(
                `
                    SELECT
                        h.*,
                        hm.id AS member_id,
                        hm.role
                    FROM households h
                    INNER JOIN household_members hm
                        ON hm.household_id = h.id
                    WHERE h.id = $1
                        AND hm.user_id = $2
                        AND hm.is_active = TRUE
                `,
                [id, user.id]
            );

            if (households.length === 0) return jsonError("Household not found.", 404);

            const members = await db.query(
                `
                    SELECT *
                    FROM household_members
                    WHERE household_id = $1
                        AND is_active = TRUE
                    ORDER BY
                        CASE role
                            WHEN 'owner' THEN 1
                            WHEN 'admin' THEN 2
                            ELSE 3
                        END,
                        display_name ASC
                `,
                [id]
            );

            return jsonOk({
                household: {
                    ...households[0],
                    members,
                },
            });
        } catch (err) {
            return serverError("GET /api/households/[id]", err);
        }
    }
);

export const PATCH = withUser<Promise<{ id: string }>>(
    async (req, context, user) => {
        try {
            const params = await context.params;
            const id = params?.id;

            if (!id) return jsonError("Household ID is required.", 400);

            const body = await req.json();
            const name = cleanString(body?.name);

            if (!name) return jsonError("Household name is required.", 400);

            const result = await db.query(
                `
                    UPDATE households
                    SET name = $2,
                        updated_at = NOW()
                    WHERE id = $1
                        AND owner_user_id = $3
                    RETURNING *
                `,
                [id, name, user.id]
            );

            if (result.length === 0) return jsonError("Household not found or permission denied.", 403);

            return jsonOk({ household: result[0] });
        } catch (err) {
            return serverError("PATCH /api/households/[id]", err);
        }
    }
);

export const DELETE = withUser<Promise<{ id: string }>>(
    async (_req, context, user) => {
        try {
            const params = await context.params;
            const id = params?.id;

            if (!id) return jsonError("Household ID is required.", 400);

            const result = await db.query(
                `
                    DELETE FROM households
                    WHERE id = $1
                        AND owner_user_id = $2
                    RETURNING id
                `,
                [id, user.id]
            );

            if (result.length === 0) return jsonError("Household not found or permission denied.", 403);

            return jsonOk({ success: true });
        } catch (err) {
            return serverError("DELETE /api/households/[id]", err);
        }
    }
);