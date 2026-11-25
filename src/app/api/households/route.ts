import { cleanString, jsonError, jsonOk, serverError } from "@/lib/api/apiUtils";
import { withUser } from "@/lib/api/withUser";
import db from "@/lib/db";
import { HouseholdCreatePayload } from "@/types/households";

export const GET = withUser(async (_req, _context, user) => {
    try {
        const res = await db.query(
            `
                SELECT
                    h.*,
                    hm.id AS member_id,
                    hm.role
                FROM households h
                INNER JOIN household_members hm
                    ON hm.household_id = h.id
                WHERE hm.user_id = $1
                    AND hm.is_active = TRUE
                ORDER BY h.name ASC
            `,
            [user.id]
        );

        return jsonOk({ households: res });
    } catch (err) {
        return serverError("GET /api/households", err);
    }
});

export const POST = withUser(async (req, _context, user) => {
    try {
        const body = (await req.json()) as HouseholdCreatePayload;
        const name = cleanString(body?.name);

        if (!name) return jsonError("Household name is required.", 400);

        const color = body.color ?? "#808080";
        if (typeof color !== "string" || !/^#[0-9a-fA-F]{6}$/.test(color)) return jsonError("Invalid household color.", 400);

        const res = await db.query(
            `
                WITH new_household AS (
                    INSERT INTO households (
                        name,
                        owner_user_id,
                        color
                    )
                    VALUES ($1, $2, $3)
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
                        h.id,
                        u.id,
                        u.name,
                        'owner'
                    FROM new_household h
                    INNER JOIN users u
                        ON u.id = h.owner_user_id
                    RETURNING *
                )
                SELECT
                    h.*,
                    m.id AS member_id,
                    m.role
                FROM new_household h
                INNER JOIN new_member m
                    ON m.household_id = h.id
            `,
            [name, user.id, color]
        );

        if (res.length === 0) return jsonError("Household was not created.", 400);

        return jsonOk({
            success: true,
            household: res[0],
        }, 201);
    } catch (err) {
        return serverError("POST /api/households", err);
    }
});