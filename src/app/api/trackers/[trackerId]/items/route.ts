import db from "@/lib/db";
import { withUser } from "@/lib/api/withUser";
import { cleanString, cleanStringArray, jsonError, jsonOk, serverError } from "@/lib/api/apiUtils";

type Params = Promise<{
    trackerId: string;
}>;

export const POST = withUser<Params>(async (req, context, user) => {
    try {
        const { trackerId } = await context.params!;
        const body = await req.json();

        const title = cleanString(body.title);
        const status = cleanString(body.status);

        if (!title) return jsonError("Title is required.", 400);
        if (!status) return jsonError("Status is required.", 400);

        const priority = cleanString(body.priority);
        const notes = cleanString(body.notes);
        const url = cleanString(body.url);
        const tags = cleanStringArray(body.tags);

        const field_values =
            body.field_values &&
                typeof body.field_values === "object" &&
                !Array.isArray(body.field_values)
                ? body.field_values
                : {};

        const sortOrder =
            typeof body.sort_order === "number"
                ? body.sort_order
                : null;

        const result = await db.query(
            `
                INSERT INTO simple_tracker_items (
                    tracker_id,
                    user_id,
                    title,
                    status,
                    priority,
                    notes,
                    url,
                    tags,
                    field_values,
                    sort_order,
                    updated_at
                )
                SELECT
                    id,
                    user_id,
                    $3,
                    $4,
                    $5,
                    $6,
                    $7,
                    $8::jsonb,
                    $9::jsonb,
                    $10,
                    NOW()
                FROM simple_trackers
                WHERE id = $2
                  AND user_id = $1
                  AND is_archived = false
                RETURNING
                    id,
                    tracker_id,
                    user_id,
                    title,
                    status,
                    priority,
                    notes,
                    url,
                    tags,
                    field_values,
                    sort_order,
                    is_archived,
                    created_at,
                    updated_at
            `,
            [
                user.id,
                trackerId,
                title,
                status,
                priority,
                notes,
                url,
                JSON.stringify(tags),
                JSON.stringify(field_values),
                sortOrder,
            ]
        );

        if (result.length === 0) return jsonError("Tracker not found.", 404);

        return jsonOk({ success: true, item: result[0] });
    } catch (err) {
        return serverError("POST /api/trackers/[trackerId]/items error:", err);
    }
});