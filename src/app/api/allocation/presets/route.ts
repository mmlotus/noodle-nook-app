import { cleanString, jsonError, jsonOk, serverError } from "@/lib/api/apiUtils";
import { withUser } from "@/lib/api/withUser";
import db from "@/lib/db";
import { CreateAllocationPresetPayload } from "@/types/allocation";

export const GET = withUser(async (_req, _context, user) => {
    try {
        const presets = await db.query(
            `
                SELECT
                    p.id,
                    p.name,
                    p.source_account_id AS "sourceAccountId",
                    source.name AS "sourceAccountName",
                    p.is_default AS "isDefault",
                    p.created_at AS "createdAt",
                    p.updated_at AS "updatedAt",
                    COALESCE(
                        JSON_AGG(
                            JSON_BUILD_OBJECT(
                                'id', r.id,
                                'destinationAccountId', r.destination_account_id,
                                'destinationAccountName', destination.name,
                                'fixedAmount', r.fixed_amount::float,
                                'percentage', r.percentage::float,
                                'sortOrder', r.sort_order
                            )
                            ORDER BY r.sort_order
                        ) FILTER (WHERE r.id IS NOT NULL),
                        '[]'::json
                    ) AS rules
                FROM allocation_presets p
                JOIN allocation_accounts source
                    ON source.id = p.source_account_id
                LEFT JOIN allocation_rules r
                    ON r.preset_id = p.id
                LEFT JOIN allocation_accounts destination
                    ON destination.id = r.destination_account_id
                WHERE p.user_id = $1
                GROUP BY
                    p.id,
                    source.name
                ORDER BY LOWER(p.name) ASC
            `,
            [user.id]
        );

        return jsonOk({ presets });
    } catch (err) {
        return serverError("GET /api/allocation/presets", err);
    }
});

export const POST = withUser(async (req, _context, user) => {
    try {
        const body = (await req.json()) as CreateAllocationPresetPayload;

        const name = cleanString(body.name);
        const sourceAccountId = cleanString(body.sourceAccountId);
        const rules = Array.isArray(body.rules) ? body.rules : [];

        if (!name) return jsonError("Preset name is required.", 400);

        if (!sourceAccountId) return jsonError("Source account is required.", 400);

        if (rules.length === 0) return jsonError("At least one allocation rule is required.", 400);

        const sourceAccount = await db.query(
            `
                SELECT id
                FROM allocation_accounts
                WHERE id = $1
                AND user_id = $2
                LIMIT 1
            `,
            [sourceAccountId, user.id]
        );

        if (sourceAccount.length === 0) return jsonError("Source account was not found.", 404);

        const existingPreset = await db.query(
            `
                SELECT id
                FROM allocation_presets
                WHERE user_id = $1
                AND LOWER(name) = LOWER($2)
                LIMIT 1
            `,
            [user.id, name]
        );

        if (existingPreset.length > 0) return jsonError("You already have a preset with that name.", 409);

        const destinationIds = new Set<string>();
        let totalPercentage = 0;

        for (const rule of rules) {
            const destinationAccountId = cleanString(rule.destinationAccountId);
            const fixedAmount = Number(rule.fixedAmount);
            const percentage = Number(rule.percentage);

            if (!destinationAccountId) return jsonError("Every allocation must have a destination account.", 400);

            if (!Number.isFinite(fixedAmount) || fixedAmount < 0) return jsonError("Fixed amounts cannot be negative.", 400);

            if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) return jsonError("Percentages must be between 0 and 100.", 400);

            if (fixedAmount === 0 && percentage === 0) return jsonError("Every allocation must have a fixed amount, percentage, or both.", 400);

            if (destinationIds.has(destinationAccountId)) return jsonError("The same destination account cannot be added more than once.", 400);

            destinationIds.add(destinationAccountId);
            totalPercentage += percentage;
        }

        if (totalPercentage > 100) return jsonError("Total percentage allcoations cannot exceed 100%.", 400);

        const ownedDestinations = await db.query(
            `
                SELECT id
                FROM allocation_accounts
                WHERE user_id = $1
                AND id = ANY($2::uuid[])
            `,
            [user.id, [...destinationIds]]
        );

        if (ownedDestinations.length !== destinationIds.size) return jsonError("One or more destination accounts were not found.", 404);

        const result = await db.query(
            `
                WITH new_preset AS (
                    INSERT INTO allocation_presets (
                        user_id,
                        name,
                        source_account_id,
                        updated_at
                    )
                    VALUES ($1, $2, $3, NOW())
                    RETURNING id
                ),
                rule_data AS (
                    SELECT
                        destination_account_id,
                        fixed_amount,
                        percentage,
                        sort_order
                    FROM JSONB_TO_RECORDSET($4::jsonb) AS x(
                        destination_account_id UUID,
                        fixed_amount NUMERIC,
                        percentage NUMERIC,
                        sort_order INTEGER
                    )
                ),
                inserted_rules AS (
                    INSERT INTO allocation_rules (
                        preset_id,
                        destination_account_id,
                        fixed_amount,
                        percentage,
                        sort_order
                    )
                    SELECT
                        new_preset.id,
                        rule_data.destination_account_id,
                        rule_data.fixed_amount,
                        rule_data.percentage,
                        rule_data.sort_order
                    FROM new_preset
                    CROSS JOIN rule_data
                    RETURNING id
                )
                SELECT id
                FROM new_preset
            `,
            [user.id, name, sourceAccountId, JSON.stringify(
                rules.map((rule, index) => ({
                    destination_account_id: rule.destinationAccountId,
                    fixed_amount: Number(rule.fixedAmount),
                    percentage: Number(rule.percentage),
                    sort_order: index
                }))
            )]
        );

        return jsonOk({
            success: true,
            presetId: result[0].id
        });
    } catch (err) {
        return serverError("POST /api/allocation/presets", err);
    }
});