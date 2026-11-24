import { cleanString, jsonError, jsonOk, serverError } from "@/lib/api/apiUtils";
import { withUser } from "@/lib/api/withUser";
import db from "@/lib/db";
import { sendPushToUser } from "@/lib/push/sendPushNotification";
import { HouseholdInvitationCreatePayload } from "@/types/households";

export const GET = withUser<Promise<{ id: string }>>(
    async (_req, context, user) => {
        try {
            const params = await context.params;
            const id = params?.id;

            if (!id) return jsonError("Household ID is required.", 400);

            const permissions = await db.query(
                `
                    SELECT id
                    FROM household_members
                    WHERE household_id = $1
                        AND user_id = $2
                        AND is_active = TRUE
                        AND role IN ('owner', 'admin')
                `,
                [id, user.id]
            );

            if (permissions.length === 0) return jsonError("Permission denied.", 403);

            const result = await db.query(
                `
                    SELECT
                        hi.*,
                        u.name AS invited_user_name,
                        u.email AS invited_user_email
                    FROM household_invitations hi
                    INNER JOIN users u
                        ON u.id = hi.invited_user_id
                    WHERE hi.household_id = $1
                        AND hi.status = 'pending'
                    ORDER BY hi.created_at DESC
                `,
                [id]
            );

            return jsonOk({ invitations: result });
        } catch (err) {
            return serverError("GET /api/households/[id]/invitations", err);
        }
    }
);

export const POST = withUser<Promise<{ id: string }>>(
    async (req, context, user) => {
        try {
            const params = await context.params;
            const id = params?.id;

            if (!id) return jsonError("Household ID is required.", 400);

            const body = (await req.json()) as HouseholdInvitationCreatePayload;

            const email = cleanString(body?.email)?.toLowerCase();
            const role = body?.role || "member";

            if (!email) return jsonError("Email address is required.", 400);

            if (role !== "admin" && role !== "member") return jsonError("Invalid household role.", 400);

            const permissions = await db.query(
                `
                    SELECT role
                    FROM household_members
                    WHERE household_id = $1
                        AND user_id = $2
                        AND is_active = TRUE
                        AND role IN ('owner', 'admin')
                `,
                [id, user.id]
            );

            if (permissions.length === 0) return jsonError("Permission denied.", 403);

            const users = await db.query(
                `
                    SELECT id
                    FROM users
                    WHERE LOWER(email) = $1
                `,
                [email]
            );

            if (users.length === 0) return jsonError("No NoodleNook account found with that email.", 404);

            const invitedUserId = users[0].id;
            if (invitedUserId === user.id) return jsonError("You cannot invite yourself.", 400);

            const existingMembers = await db.query(
                `
                    SELECT id
                    FROM household_members
                    WHERE household_id = $1
                        AND user_id = $2
                        AND is_active = TRUE
                `,
                [id, invitedUserId]
            );

            if (existingMembers.length > 0) return jsonError("This user already belongs to the household.", 409);

            const result = await db.query(
                `
                    INSERT INTO household_invitations (
                        household_id,
                        invited_user_id,
                        invited_by_user_id,
                        role
                    )
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (household_id, invited_user_id)
                    WHERE status = 'pending'
                    DO NOTHING
                    RETURNING *
                `,
                [id, invitedUserId, user.id, role]
            );

            if (result.length === 0) return jsonError("This user already has a pending invitation.", 409);

            try {
                const households = await db.query(
                    `SELECT name FROM households WHERE id = $1`,
                    [id]
                );

                await sendPushToUser(invitedUserId, {
                    title: "Household Invitation",
                    body: `You've been invited to join ${households[0].name}!`,
                    url: "/households",
                });
            } catch (err) {
                console.error("Invitation notification failed:", err);
            }

            return jsonOk({ invitation: result[0] }, 201);
        } catch (err) {
            return serverError("POST /api/households/[id]/invitations", err);
        }
    }
);