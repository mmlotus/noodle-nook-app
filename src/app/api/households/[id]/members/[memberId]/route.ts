import { cleanString, jsonError, jsonOk, serverError } from "@/lib/api/apiUtils";
import { withUser } from "@/lib/api/withUser";
import db from "@/lib/db";
import { HouseholdMemberUpdatePayload } from "@/types/households";

export const PATCH = withUser<Promise<{ id: string; memberId: string }>>(
    async (req, context, user) => {
        try {
            const params = await context.params;
            const id = params?.id;
            const memberId = params?.memberId;

            if (!id || !memberId) return jsonError("Household and member IDs are required.", 400);

            const body = (await req.json()) as HouseholdMemberUpdatePayload;

            const displayName = cleanString(body?.display_name);
            const color = cleanString(body?.color);
            const role = body?.role;

            if (!displayName) return jsonError("Display name is required.", 400);
            if (!color || !/^#[0-9a-fA-F]{6}$/.test(color)) return jsonError("Invalid profile color.", 400);
            if (role !== "owner" && role !== "admin" && role !== "member") return jsonError("Invalid household role.", 400);

            const result = await db.query(
                `
                    UPDATE household_members AS target
                    SET display_name = $3,
                        color = $4,
                        role = $5,
                        updated_at = NOW()
                    FROM household_members AS actor
                    WHERE target.household_id = $1
                        AND target.id = $2
                        AND target.is_active = TRUE
                        AND actor.household_id = target.household_id
                        AND actor.user_id = $6
                        AND actor.is_active = TRUE
                        AND (
                            actor.role = 'owner'
                            OR actor.id = target.id
                            OR (
                                actor.role = 'admin'
                                AND target.role = 'member'
                            )
                        )
                        AND (
                            target.role = $5
                            OR (
                                actor.role = 'owner'
                                AND target.role <> 'owner'
                                AND target.user_id IS NOT NULL
                                AND $5 IN ('admin', 'member')
                            )
                        )
                    RETURNING target.*
                `,
                [id, memberId, displayName, color, role, user.id]
            );

            if (result.length === 0) return jsonError("Member not found or permission denied.", 403);

            return jsonOk({ member: result[0] });
        } catch (err) {
            return serverError("PATCH /api/households/[id]/members/[memberId]", err);
        }
    }
);

export const DELETE = withUser<Promise<{ id: string; memberId: string }>>(
    async (_req, context, user) => {
        try {
            const params = await context.params;
            const id = params?.id;
            const memberId = params?.memberId;

            if (!id || !memberId) return jsonError("Household and member IDs are required.", 400);

            const result = await db.query(
                `
                    UPDATE household_members AS target
                    SET is_active = FALSE,
                        updated_at = NOW()
                    FROM household_members AS actor
                    WHERE target.household_id = $1
                        AND target.id = $2
                        AND target.is_active = TRUE
                        AND target.role <> 'owner'
                        AND actor.household_id = target.household_id
                        AND actor.user_id = $3
                        AND actor.is_active = TRUE
                        AND actor.id <> target.id
                        AND (
                            actor.role = 'owner'
                            OR (
                                actor.role = 'admin'
                                AND target.role = 'member'
                            )
                        )
                    RETURNING target.id
                `,
                [id, memberId, user.id]
            );

            if (result.length === 0) return jsonError("Member not found or permission denied.", 403);

            return jsonOk({ success: true });
        } catch (err) {
            return serverError("DELETE /api/households/[id]/members/[memberId]", err);
        }
    }
);