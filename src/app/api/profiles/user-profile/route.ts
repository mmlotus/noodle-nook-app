import db from "@/lib/db";
import { withUser } from "@/lib/api/withUser";
import { jsonError, jsonOk, serverError } from "@/lib/api/apiUtils";

const allowedThemes = ["system", "light", "dark"];
const allowedWeightUnits = ["lb", "kg", "g", "st"];

export const GET = withUser(async (_req, _context, user) => {
    try {
        const result = await db.query(
            `SELECT
                id,
                email,
                name,
                subtitle_choice,
                theme_preference,
                preferred_weight_unit,
                push_notifications_enabled
            FROM users
            WHERE id = $1
            `,
            [user.id]
        );

        const dbUser = result[0];

        if (!dbUser) return jsonError("User not found", 404);

        return jsonOk(dbUser);
    } catch (err) {
        return serverError("GET /api/profiles/user-profile", err);
    }
});

export const POST = withUser(async (req, _context, user) => {
    try {
        const { name, subtitle_choice, theme_preference, preferred_weight_unit, push_notifications_enabled } = await req.json();

        if (!name || typeof name !== "string") {
            return jsonError("Invalid name", 400);
        }

        if (theme_preference !== undefined && (typeof theme_preference !== "string" || !allowedThemes.includes(theme_preference))
        ) {
            return jsonError("Invalid theme preference", 400);
        }

        if (preferred_weight_unit !== undefined && (typeof preferred_weight_unit !== "string" || !allowedWeightUnits.includes(preferred_weight_unit))
        ) {
            return jsonError("Preferred weight unit is invalid", 400);
        }

        const result = await db.query(
            `
                UPDATE users
                SET
                    name = $1,
                    subtitle_choice = $2,
                    theme_preference = $3,
                    preferred_weight_unit = $4,
                    push_notifications_enabled = $5,
                    updated_at = NOW()
                WHERE id = $6
                RETURNING
                    id, email, name, subtitle_choice, theme_preference,
                    preferred_weight_unit, push_notifications_enabled
            `,
            [
                name.trim(),
                subtitle_choice || "",
                theme_preference || "system",
                preferred_weight_unit || "lb",
                push_notifications_enabled,
                user.id,
            ]
        );

        if (result.length === 0) {
            return jsonError("User not found or unchanged.", 404);
        }

        return jsonOk({ success: true, user: result[0] });
    } catch (err) {
        return serverError("POST /api/profiles/user-profile", err);
    }
});