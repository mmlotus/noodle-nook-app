import { jsonError, jsonOk, serverError } from "@/lib/api/apiUtils";
import { withUser } from "@/lib/api/withUser";
import db from "@/lib/db";

type Params = Promise<{
    id: string;
}>;

export const PATCH = withUser<Params>(async (_req, context, user) => {
    try {
        const { id } = await context.params!;

        const preset = await db.query(
            `
                SELECT id
                FROM allocation_presets
                WHERE id = $1
                AND user_id = $2
                LIMIT 1
            `,
            [id, user.id]
        );

        if (preset.length === 0) return jsonError("Preset not found.", 404);

        await db.query(
            `
                UPDATE allocation_presets
                SET is_default =
                    CASE WHEN id = $2
                    THEN true
                    ELSE false
                    END
                WHERE user_id = $1
            `,
            [user.id, id]
        );

        return jsonOk({ success: true });
    } catch (err) {
        return serverError("PATCH /api/allocation/presets/[id]/default", err);
    }
});