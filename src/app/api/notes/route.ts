import { cleanString, jsonOk, serverError } from "@/lib/api/apiUtils";
import { withUser } from "@/lib/api/withUser";
import db from "@/lib/db";
import { CreateNotePayload } from "@/types/notes";

export const GET = withUser(async (req, _context, user) => {
    try {
        const { searchParams } = new URL(req.url);

        const search = searchParams.get("search")?.trim() || "";
        const sort = searchParams.get("sort")?.trim() || "recentlyEdited";

        const conditions = ["user_id = $1"];
        const params: unknown[] = [user.id];

        if (search) {
            params.push(`%${search}%`);
            const searchParamIndex = params.length;

            conditions.push(`
                (
                    title ILIKE $${searchParamIndex}
                    OR body ILIKE $${searchParamIndex}
                )
            `);
        }

        let orderBy = "updated_at DESC";

        if (sort === "newestCreated") {
            orderBy = "created_at DESC";
        } else if (sort === "oldestCreated") {
            orderBy = "created_at ASC"
        } else if (sort === "titleAsc") {
            orderBy = "LOWER(title) ASC, updated_at DESC";
        } else if (sort === "titleDesc") {
            orderBy = "LOWER(title) DESC, updated_at DESC";
        }

        const notes = await db.query(
            `
                SELECT
                    id,
                    title,
                    body,
                    created_at AS "createdAt",
                    updated_at AS "updatedAt"
                FROM notes
                WHERE ${conditions.join(" AND ")}
                ORDER BY ${orderBy}
            `,
            params
        );

        return jsonOk({ notes });
    } catch (err) {
        return serverError("GET /api/notes", err);
    }
});

export const POST = withUser(async (req, _context, user) => {
    try {
        const body = (await req.json()) as CreateNotePayload;

        const title = cleanString(body.title) || "Untitled Note";
        const noteBody = typeof body.body === "string" ? body.body : "";

        const result = await db.query(
            `
                INSERT INTO notes (
                    user_id,
                    title,
                    body,
                    updated_at
                )
                VALUES (
                    $1, $2, $3, NOW()
                )
                RETURNING
                    id,
                    title,
                    body,
                    created_at AS "createdAt",
                    updated_at AS "updatedAt"
            `,
            [user.id, title, noteBody]
        );

        return jsonOk({ success: true, note: result[0] });
    } catch (err) {
        return serverError("POST /api/notes", err);
    }
});