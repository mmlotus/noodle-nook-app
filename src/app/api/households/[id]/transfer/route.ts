import { cleanString, jsonError, jsonOk, serverError } from "@/lib/api/apiUtils";
import { withUser } from "@/lib/api/withUser";
import db from "@/lib/db";

export const POST = withUser<Promise<{ id: string }>>(
    async (req, context, user) => {
        try {
            const params = await context.params;
            const id = params?.id;

            if (!id) return jsonError("Household ID is requird.", 400);

            const body = await req.json();
            const memberId = cleanString(body?.member_id);

            if (!memberId) return jsonError("New owner is required.", 400);

            const result = await db.query(
                `
                    WITH eligible_member AS (
                        SELECT hm.id, hm.user_id
                        FROM household_members hm
                        INNER JOIN households h
                            ON h.id = hm.household_id
                        WHERE h.id = $1
                            AND h.owner_user_id = $2
                            AND hm.id = $3
                            AND hm.is_active = TRUE
                            AND hm.user_id IS NOT NULL
                            AND hm.user_id <> $2
                            AND hm.role <> 'owner'
                        FOR UPDATE OF h, hm
                    ),
                    previous_owner AS (
                        UPDATE household_members
                        SET role = 'admin',
                            updated_at = NOW()
                        WHERE household_id = $1
                            AND user_id = $2
                            AND role = 'owner'
                            AND is_active = TRUE
                            AND EXISTS (SELECT 1 FROM eligible_member)
                        RETURNING id
                    ),
                    new_owner AS (
                        UPDATE household_members hm
                        SET role = 'owner',
                            updated_at = NOW()
                        FROM eligible_member em
                        WHERE hm.id = em.id
                            AND EXISTS (SELECT 1 FROM previous_owner)
                        RETURNING hm.user_id
                    )
                    UPDATE households h
                    SET owner_user_id = no.user_id,
                        updated_at = NOW()
                    FROM new_owner no
                    WHERE h.id = $1
                        AND h.owner_user_id = $2
                    RETURNING h.*
                `,
                [id, user.id, memberId]
            );

            if (result.length === 0) return jsonError("Unable to transfer household ownership.", 403);

            return jsonOk({ household: result[0] });
        } catch (err) {
            return serverError("POST /api/households/[id]/transfer", err);
        }
    }
);