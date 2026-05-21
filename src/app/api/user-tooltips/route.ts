import { jsonError, jsonOk, serverError } from "@/lib/api/apiUtils";
import { withUser } from "@/lib/api/withUser";
import db from "@/lib/db";

export const GET = withUser(async (_req, _context, user) => {
    try {
        const result = await db.query(
            `
            SELECT
                tooltips_enabled,
                dismissed_tooltips
            FROM users
            WHERE id = $1
            `,
            [user.id]
        );

        if (result.length === 0) return jsonError("User not found", 404);

        const dbUser = result[0];

        return jsonOk({
                tooltipsEnabled: dbUser.tooltips_enabled,
                dismissed: JSON.parse(dbUser.dismissed_tooltips || "[]"),
            });
    } catch (err) {
        return serverError("Tooltip API GET", err);
    }
});

export const PATCH = withUser(async (req, _context, user) => {
    try {
        const { tooltipsEnabled, dismissed } = await req.json();

        if (tooltipsEnabled !== undefined && typeof tooltipsEnabled !== "boolean") {
            return jsonError("tooltipsEnabled must be a boolean", 400);
        }

        if (dismissed !== undefined && !Array.isArray(dismissed)) {
            return jsonError("dismissed must be an array of strings", 400);
        }

        await db.query(
            `
            UPDATE users
            SET
                tooltips_enabled = COALESCE($1, tooltips_enabled),
                dismissed_tooltips = COALESCE($2, dismissed_tooltips)
            WHERE id = $3
            `,
            [
                tooltipsEnabled !== undefined ? (tooltipsEnabled ? 1 : 0) : null,
                dismissed !== undefined ? JSON.stringify(dismissed) : null,
                user.id,
            ]
        );

        return jsonOk({ success: true });
    } catch (err) {
        return serverError("Tooltip API PATCH", err);
    }
});