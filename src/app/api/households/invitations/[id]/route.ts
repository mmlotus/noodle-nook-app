import { jsonError, jsonOk, serverError } from "@/lib/api/apiUtils";
import { withUser } from "@/lib/api/withUser";
import db from "@/lib/db";
import { sendPushToUser } from "@/lib/push/sendPushNotification";
import { HouseholdInvitationResponsePayload } from "@/types/households";

export const PATCH = withUser<Promise<{ id: string }>>(
    async (req, context, user) => {
        try {
            const params = await context.params;
            const id = params?.id;

            if (!id) return jsonError("Invitation ID is required.", 400);

            const body = (await req.json()) as HouseholdInvitationResponsePayload;

            const action = body?.action;
            if (action !== "accept" && action !== "decline") return jsonError("Invalid invitation response.", 400);

            if (action === "decline") {
                const result = await db.query(
                    `
                        UPDATE household_invitations
                        SET status = 'declined',
                            responded_at = NOW()
                        WHERE id = $1
                            AND invited_user_id = $2
                            AND status = 'pending'
                        RETURNING *
                    `,
                    [id, user.id]
                );

                if (result.length === 0) return jsonError("Invitation not found or no longer pending.", 404);

                return jsonOk({ invitation: result[0] });
            }

            const result = await db.query(
                `
                    WITH accepted_invitations AS (
                        UPDATE household_invitations
                        SET status = 'accepted',
                            responded_at = NOW()
                        WHERE id = $1
                            AND invited_user_id = $2
                            AND status = 'pending'
                        RETURNING *
                    ),
                    new_member AS (
                        INSERT INTO household_members (
                            household_id,
                            user_id,
                            display_name,
                            role
                        )
                        SELECT
                            ai.household_id,
                            ai.invited_user_id,
                            u.name,
                            ai.role
                        FROM accepted_invitation ai
                        INNER JOIN users u
                            ON u.id = ai.invited_user_id
                        ON CONFLICT (household_id, user_id)
                        DO UPDATE SET
                            is_active = TRUE,
                            role = CASE
                                WHEN household_members.is_active
                                    THEN household_members.role
                                ELSE EXCLUDED.role
                            END,
                            updated_at = NOW()
                        RETURNING *
                    )
                    SELECT
                        ai.*,
                        nm.id AS member_id
                    FROM accepted_invitation ai
                    INNER JOIN new_member nm
                        ON nm.household_id = ai.household_id
                `,
                [id, user.id]
            );

            if (result.length === 0) return jsonError("Invitation not found or no longer pending.", 404);

            try {
                const households = await db.query(
                    `
                        SELECT
                            h.name,
                            h.owner_user_id,
                            u.name AS member_name
                        FROM households h
                        INNER JOIN users u
                            ON u.id = $2
                        WHERE h.id = $1
                    `,
                    [result[0].household_id, user.id]
                );

                if (households.length > 0) {
                    const household = households[0];

                    await sendPushToUser(household.owner_user_id, {
                        title: "Household Invitation Accepted!",
                        body: `${household.member_name} has joined ${household.name}!`,
                        url: `/households/${result[0].household_id}`,
                    });
                }
            } catch (err) {
                console.error("Acceptance notifiation failed:", err);
            }

            return jsonOk({ invitation: result[0] });
        } catch (err) {
            return serverError("PATCH /api/households/invitations/[id]", err);
        }
    }
);

export const DELETE = withUser<Promise<{ id: string }>>(
    async (_req, context, user) => {
        try {
            const params = await context.params;
            const id = params?.id;

            if (!id) return jsonError("Invitation ID is required.", 400);

            const result = await db.query(
                `
                    UPDATE household_invitations hi
                    SET status = 'cancelled',
                        responded_at = NOW()
                    WHERE hi.id = $1
                        AND hi.status = 'pending'
                        AND EXISTS (
                            SELECT 1
                            FROM household_members hm
                            WHERE hm.household_id = hi.household_id
                                AND hm.user_id = $2
                                AND hm.is_active = TRUE
                                AND hm.role IN ('owner', 'admin')
                        )
                    RETURNING hi.*
                `,
                [id, user.id]
            );

            if (result.length === 0) return jsonError("Invitation not found, no longer pending, or permission denied.", 404);

            return jsonOk({ invitation: result[0] });
        } catch (err) {
            return serverError("DELETE /api/households/invitations/[id]", err);
        }
    }
);