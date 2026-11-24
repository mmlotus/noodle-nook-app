import { jsonError, jsonOk, serverError } from "@/lib/api/apiUtils";
import { withUser } from "@/lib/api/withUser";
import db from "@/lib/db";

export const POST = withUser<Promise<{ id: string }>>(
    async (_req, context, user) => {
        try {
            const params = await context.params;
            const id = params?.id;

            if (!id) return jsonError("Household ID is required.", 400);

            const result = await db.query(
                `
                    UPDATE household_members
                    SET is_active = FALSE,
                        updated_at = NOW()
                    WHERE household_id = $1
                        AND user_id = $2
                        AND is_active = TRUE
                        AND role <> 'owner'
                    RETURNING id
                `,
                [id, user.id]
            );

            if (result.length === 0) return jsonError("Unable to leave household. Owners must transfer ownership first.", 403);

            return jsonOk({ success: true });
        } catch (err) {
            return serverError("POST /api/households/[id]/leave", err);
        }
    }
);