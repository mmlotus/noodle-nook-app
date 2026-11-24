import { cleanString, jsonError, jsonOk, serverError } from "@/lib/api/apiUtils";
import { withUser } from "@/lib/api/withUser";
import db from "@/lib/db";

export const POST = withUser<Promise<{ id: string }>>(
    async (req, context, user) => {
        try {
            const params = await context.params;
            const id = params?.id;
            if (!id) return jsonError("Household ID is required.", 400);

            const body = await req.json();
            const displayName = cleanString(body?.display_name);
            const color = cleanString(body?.color) || "#808080";

            if (!displayName) return jsonError("Member name is required.", 400);

            if (!/^#[0-9a-fA-F]{6}$/.test(color)) return jsonError("Invalid member color.", 400);

            const res = await db.query(
                `
                    INSERT INTO household_members (
                        household_id,
                        display_name,
                        color,
                        role
                    )
                    SELECT $1, $2, $3, 'member'
                    WHERE EXISTS (
                        SELECT 1
                        FROM household_members
                        WHERE household_id = $1
                            AND user_id = $4
                            AND is_active = TRUE
                            AND role IN ('owner', 'admin')
                    )
                    RETURNING *
                `,
                [id, displayName, color, user.id]
            );

            if (res.length === 0) return jsonError("Permission denied.", 403);

            return jsonOk({
                member: res[0],
            }, 201);
        } catch (err) {
            return serverError("POST /api/households/[id]/members", err);
        }
    }
);