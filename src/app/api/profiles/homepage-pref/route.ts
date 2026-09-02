import { jsonError, jsonOk, serverError } from "@/lib/api/apiUtils";
import { withUser } from "@/lib/api/withUser";
import db from "@/lib/db";

export const PATCH = withUser(async (req, _context, user) => {
    try {
        const body = await req.json();
        const { collapsed_home_sections } = body;

        if (
            !Array.isArray(collapsed_home_sections) ||
            !collapsed_home_sections.every((section) => typeof section === "string")
        ) {
            return jsonError("Collapsed home sections are invalid.", 400);
        }

        const result = await db.query(
            `
                UPDATE users
                SET
                    collapsed_home_sections = $1::jsonb,
                    updated_at = NOW()
                WHERE id = $2
                RETURNING collapsed_home_sections
            `,
            [
                JSON.stringify(collapsed_home_sections),
                user.id,
            ]
        );

        if (result.length === 0) return jsonError("User not found.", 404);

        return jsonOk({
            success: true,
            collapsed_home_sections: result[0].collapsed_home_sections,
        });
    } catch (err) {
        return serverError("PATCH /api/profiles/homepage-pref", err);
    }
});