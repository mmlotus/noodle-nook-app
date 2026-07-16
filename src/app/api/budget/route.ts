import { jsonError, jsonOk, serverError } from "@/lib/api/apiUtils";
import { withUser } from "@/lib/api/withUser";
import db from "@/lib/db";

export const GET = withUser(async (_req, _context, user) => {
    try {
        const result = await db.query(
            `
                SELECT
                    id,
                    owner_user_id,
                    name,
                    theme_key,
                    is_active,
                    created_at,
                    updated_at
                FROM budgets
                WHERE owner_user_id = $1
                    AND is_active = true
                ORDER BY created_at ASC, name ASC
            `,
            [user.id]
        );

        return jsonOk({ budgets: result });
    } catch (err) {
        return serverError("GET /api/budget", err);
    }
});

export const POST = withUser(async (req, _context, user) => {
    try {
        const body = (await req.json()) as {
            name?: unknown;
            theme_key?: unknown;
        };

        const name = typeof body.name === "string" ? body.name.trim() : "";

        if (!name) return jsonError("Budget name is required.", 400);

        const validThemeKeys = [
            "berries",
            "azure",
            "sage",
            "seafoam",
            "citrus",
            "blush",
        ] as const;

        const requestedThemeKey =
            typeof body.theme_key === "string"
                ? body.theme_key.trim()
                : "";

        const themeKey = validThemeKeys.includes(
            requestedThemeKey as typeof validThemeKeys[number]
        )
            ? requestedThemeKey
            : "berries";

        const result = await db.query(
            `
                INSERT INTO budgets (
                    owner_user_id,
                    name,
                    theme_key,
                    is_active,
                    updated_at
                )
                VALUES ($1, $2, $3, true, NOW())
                RETURNING
                    id,
                    owner_user_id,
                    name,
                    theme_key,
                    is_active,
                    created_at,
                    updated_at
            `,
            [user.id, name, themeKey]
        );

        if (result.length === 0) return jsonError("Budget was not created.", 400);

        return jsonOk({
            success: true,
            budget: result[0],
        });
    } catch (err) {
        return serverError("POST /api/budget", err);
    }
});

export const PATCH = withUser(async (req, _context, user) => {
    try {
        const body = (await req.json()) as {
            id?: unknown;
            theme_key?: unknown;
        };

        const id = typeof body.id === "string" ? body.id.trim() : "";
        const requestedThemeKey = typeof body.theme_key === "string"
            ? body.theme_key.trim()
            : "";

        if (!id) return jsonError("Budget ID is required.", 400);

        const validThemeKeys = [
            "berries", "azure", "sage", "seafoam", "citrus", "blush",
        ] as const;

        if (!validThemeKeys.includes(requestedThemeKey as typeof validThemeKeys[number])) {
            return jsonError("Invalid budget theme.", 400);
        }

        const result = await db.query(
            `
                UPDATE budgets
                SET
                    theme_key = $1,
                    updated_at = NOW()
                WHERE id = $2
                    AND owner_user_id = $3
                    AND is_active = true
                RETURNING
                    id,
                    owner_user_id,
                    name,
                    theme_key,
                    is_active,
                    created_at,
                    updated_at
            `,
            [requestedThemeKey, id, user.id]
        );

        if (result.length === 0) {
            return jsonError("Budget was not found.", 404);
        }

        return jsonOk({
            success: true,
            budget: result[0],
        });
    } catch (err) {
        return serverError("PATCH /api/budget", err);
    }
});