import { cleanString, cleanStringArray, jsonError, jsonOk, serverError } from "@/lib/api/apiUtils";
import { withUser } from "@/lib/api/withUser";
import db from "@/lib/db";

type Params = Promise<{
    trackerId: string;
    itemId: string;
}>;

export const PATCH = withUser<Params>(async (req, context, user) => {
    try {
        const { trackerId, itemId } = await context.params!;
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
                UPDATE simple_tracker_items sti
                SET
                    title = $4,
                    status = $5,
                    priority = $6,
                    notes = $7,
                    url = $8,
                    tags = $9::jsonb,
                    field_values = $10::jsonb,
                    sort_order = $11,
                    updated_at = NOW()
                FROM simple_trackers st
                WHERE sti.tracker_id = st.id
                  AND sti.user_id = st.user_id
                  AND st.user_id = $1
                  AND st.id = $2
                  AND sti.id = $3
                  AND st.is_archived = false
                  AND sti.is_archived = false
                RETURNING
                    sti.id,
                    sti.tracker_id,
                    sti.user_id,
                    sti.title,
                    sti.status,
                    sti.priority,
                    sti.notes,
                    sti.url,
                    sti.tags,
                    sti.field_values,
                    sti.sort_order,
                    sti.is_archived,
                    sti.created_at,
                    sti.updated_at
            `,
            [
                user.id,
                trackerId,
                itemId,
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

        if (result.length === 0) return jsonError("Item not found.", 404);

        return jsonOk({ success: true, item: result[0] });
    } catch (err) {
        return serverError("PATCH /api/trackers/[trackerId]/items/[itemId] error:", err);
    }
});

export const DELETE = withUser<Params>(async (_req, context, user) => {
    try {
        const { trackerId, itemId } = await context.params!;

        await db.query(
            `
                UPDATE simple_tracker_items sti
                SET
                    is_archived = true,
                    updated_at = NOW()
                FROM simple_trackers st
                WHERE sti.tracker_id = st.id
                  AND sti.user_id = st.user_id
                  AND st.user_id = $1
                  AND st.id = $2
                  AND sti.id = $3
            `,
            [user.id, trackerId, itemId]
        );

        return jsonOk({ success: true });
    } catch (err) {
        return serverError("DELETE /api/trackers/[trackerId]/items/[itemId] error:", err);
    }
});