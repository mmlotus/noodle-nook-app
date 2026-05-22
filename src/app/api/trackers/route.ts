import db from "@/lib/db";
import { getSimpleTrackerTemplate } from "@/lib/trackers/templates";
import { cleanSlug, cleanString, cleanStringArray, jsonError, jsonOk, serverError } from "@/lib/api/apiUtils";
import { withUser } from "@/lib/api/withUser";

export const GET = withUser(async (req, _context, user) => {
    try {
        const { searchParams } = new URL(req.url);

        const slug = searchParams.get("slug");
        const search = searchParams.get("search")?.trim() || "";
        const status = searchParams.get("status")?.trim() || "";
        const tag = searchParams.get("tag")?.trim() || "";
        const sort = searchParams.get("sort")?.trim() || "newest";

        if (slug) {
            const trackerResult = await db.query(
                `
                    SELECT
                        id,
                        user_id,
                        name,
                        slug,
                        template_key,
                        tracker_kind,
                        description,
                        status_options,
                        field_config,
                        tag_options,
                        is_archived,
                        created_at,
                        updated_at
                    FROM simple_trackers
                    WHERE user_id = $1
                        AND slug = $2
                        AND is_archived = false
                    LIMIT 1
                `,
                [user.id, slug]
            );

            if (trackerResult.length === 0) {
                return jsonOk({ tracker: null, items: [] });
            }

            const tracker = trackerResult[0];

            const itemConditions = [
                "tracker_id = $1",
                "user_id = $2",
                "is_archived = false",
            ];

            const itemParams: unknown[] = [tracker.id, user.id];

            if (search) {
                itemParams.push(`%${search}%`);
                const searchParamIndex = itemParams.length;

                itemConditions.push(`
                    (
                        title ILIKE $${searchParamIndex}    
                        OR status ILIKE $${searchParamIndex}
                        OR COALESCE(priority, '') ILIKE $${searchParamIndex}
                        OR COALESCE(notes, '') ILIKE $${searchParamIndex}
                        OR COALESCE(url, '') ILIKE $${searchParamIndex}
                        OR tags::text ILIKE $${searchParamIndex}
                        OR field_values::text ILIKE $${searchParamIndex}
                    )
                `);
            }

            if (status) {
                itemParams.push(status);
                const statusParamIndex = itemParams.length;

                itemConditions.push(`status = $${statusParamIndex}`);
            }

            if (tag) {
                itemParams.push(JSON.stringify([tag]));
                const tagParamIndex = itemParams.length;

                itemConditions.push(`tags @> $${tagParamIndex}::jsonb`);
            }

            let orderBy = "created_at DESC";

            if (sort === "title_asc") {
                orderBy = "LOWER(title) ASC, created_at DESC";
            } else if (sort === "title_desc") {
                orderBy = "LOWER(title) DESC, created_at DESC";
            }

            if (sort === "oldest") {
                orderBy = "created_at ASC";
            }
            
            const items = await db.query(
                `
                    SELECT
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
                    FROM simple_tracker_items
                    WHERE ${itemConditions.join(" AND ")}
                    ORDER BY ${orderBy}
                `,
                itemParams
            );

            return jsonOk({ tracker, items });
        }

        const trackers = await db.query(
            `
                SELECT
                    id,
                    user_id,
                    name,
                    slug,
                    template_key,
                    tracker_kind,
                    description,
                    status_options,
                    field_config,
                    tag_options,
                    is_archived,
                    created_at,
                    updated_at
                FROM simple_trackers
                WHERE user_id = $1
                    AND is_archived = false
                ORDER BY created_at ASC
            `,
            [user.id]
        );

        return jsonOk({ trackers });
    } catch (err) {
        return serverError("GET /api/trackers", err);
    }
});

export const POST = withUser(async (req, _context, user) => {
    try {
        const body = await req.json();

        const templateKey = cleanString(body.templateKey);

        let name = cleanString(body.name) || "";
        let slug = typeof body.slug === "string" ? cleanSlug(body.slug) : "";
        let template_key: string | null = null;
        let description = cleanString(body.description);

        let status_options = cleanStringArray(body.status_options);
        let field_config = Array.isArray(body.field_config) ? body.field_config : [];
        let tag_options = cleanStringArray(body.tag_options);

        if (templateKey) {
            const template = getSimpleTrackerTemplate(templateKey);

            if (!template) {
                return jsonError("Invalid tracker template.", 400);
            }

            name = template.name;
            slug = template.slug;
            template_key = template.key;
            description = template.description;
            status_options = template.statuses;
            field_config = template.fields;
            tag_options = template.tags;
        }

        if (!name) return jsonError("Tracker name is required.", 400);

        if (!slug) slug = cleanSlug(name);
        if (!slug) return jsonError("Tracker slug is required.", 400);

        if (status_options.length === 0) {
            return jsonError("At least one status is required.", 400);
        }

        const result = await db.query(
            `
                INSERT INTO simple_trackers (
                    user_id,
                    name,
                    slug,
                    template_key,
                    tracker_kind,
                    description,
                    status_options,
                    field_config,
                    tag_options,
                    updated_at
                )
                VALUES (
                    $1, $2, $3, $4, 'simple', $5, $6::jsonb, $7::jsonb, $8::jsonb, NOW()
                )
                ON CONFLICT (user_id, slug)
                DO UPDATE SET
                    name = EXCLUDED.name,
                    template_key = EXCLUDED.template_key,
                    tracker_kind = EXCLUDED.tracker_kind,
                    description = EXCLUDED.description,
                    status_options = EXCLUDED.status_options,
                    field_config = EXCLUDED.field_config,
                    tag_options = EXCLUDED.tag_options,
                    is_archived = false,
                    updated_at = NOW()
                RETURNING
                    id, user_id, name, slug, template_key, tracker_kind,
                    description, status_options, field_config, tag_options,
                    is_archived, created_at, updated_at
            `,
            [
                user.id, name, slug, template_key, description,
                JSON.stringify(status_options), JSON.stringify(field_config), JSON.stringify(tag_options),
            ]
        );
        return jsonOk({ success: true, tracker: result[0] });
    } catch (err) {
        return serverError("POST /api/trackers", err);
    }
});