import db from "@/lib/db";
import { withUser } from "@/lib/api/withUser";
import { cleanString, cleanStringArray, jsonError, jsonOk, serverError } from "@/lib/api/apiUtils";

type Params = Promise<{
    trackerId: string;
}>;

export const PATCH = withUser<Params>(async (req, context, user) => {
    try {
        const { trackerId } = await context.params!;
        const body = await req.json();

        const name = cleanString(body.name);
        const description = cleanString(body.description);
        const status_options = cleanStringArray(body.status_options);
        const tag_options = cleanStringArray(body.tag_options);
        const field_config = Array.isArray(body.field_config) ? body.field_config : [];

        if (!name) return jsonError("Tracker name is required.", 400);

        if (status_options.length === 0) {
            return jsonError("At least one status is required.", 400);
        }

        const result = await db.query(
            `
                UPDATE simple_trackers st
                SET
                    name = $3,
                    description = $4,
                    status_options = $5::jsonb,
                    field_config = $6::jsonb,
                    tag_options = $7::jsonb,
                    updated_at = NOW()
                WHERE user_id = $1
                    AND id = $2
                    AND is_archived = false
                RETURNING
                    id, user_id, name, slug, template_key, tracker_find,
                    description, status_options, field_config, tag_options,
                    is_archived, created_at, updated_at
            `,
            [
                user.id, trackerId, name, description, JSON.stringify(status_options), JSON.stringify(field_config), JSON.stringify(tag_options),
            ]
        );

        if (result.length === 0) {
            return jsonError("Tracker not found.", 404);
        }

        return jsonOk({ success: true, tracker: result[0] });
    } catch (err) {
        return serverError("PATCH /api/trackers/[trackerId] error:", err);
    }
});

export const DELETE = withUser<Params>(async (_req, context, user) => {
    try {
        const { trackerId } = await context.params!;

        await db.query(
            `
                UPDATE simple_trackers
                SET
                    is_archived = true,
                    updated_at = NOW()
                WHERE user_id = $1
                    AND id = $2
            `,
            [user.id, trackerId]
        );

        return jsonOk({ success: true });
    } catch (err) {
        return serverError("DELETE /api/trackers/[trackerId] error:", err);
    }
});