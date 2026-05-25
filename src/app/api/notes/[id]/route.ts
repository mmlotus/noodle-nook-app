import { cleanString, jsonError, jsonOk, serverError } from "@/lib/api/apiUtils";
import { withUser } from "@/lib/api/withUser";
import db from "@/lib/db";
import { UpdateNotePayload } from "@/types/notes";

type Params = Promise<{
    id: string;
}>;

export const PATCH = withUser<Params>(async (req, context, user) => {
    try {
        const { id } = await context.params!;
        const body = (await req.json()) as UpdateNotePayload;

        const title = typeof body.title === "string"
            ? cleanString(body.title) || "Untitled Note"
            : undefined;

        const noteBody = typeof body.body === "string" ? body.body : undefined;

        if (title === undefined && noteBody === undefined) {
            return jsonError("No note fields were provided.", 400);
        }

        const result = await db.query(
            `
                UPDATE notes
                SET
                    title = COALESCE($1, title),
                    body = COALESCE($2, body),
                    updated_at = NOW()
                WHERE user_id = $3
                    AND id = $4
                RETURNING
                    id,
                    title,
                    body,
                    created_at AS "createdAt",
                    updated_at AS "updatedAt"
            `,
            [title, noteBody, user.id, id]
        );

        if (result.length === 0) return jsonError("Note not found.", 404);

        return jsonOk({ success: true, note: result[0] });
    } catch (err) {
        return serverError("PATCH /api/notes/[id]", err);
    }
});

export const DELETE = withUser<Params>(async (_req, context, user) => {
    try {
        const { id } = await context.params!;

        const result = await db.query(
            `
                DELETE FROM notes
                WHERE user_id = $1
                    AND id = $2
                RETURNING id
            `,
            [user.id, id]
        );

        if (result.length === 0) return jsonError("Note not found.", 404);

        return jsonOk({ success: true });
    } catch (err) {
        return serverError("DELETE /api/notes/[id]", err);
    }
});