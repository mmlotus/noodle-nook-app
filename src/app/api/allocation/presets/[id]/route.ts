import { cleanString, jsonError, jsonOk, serverError } from "@/lib/api/apiUtils";
import { withUser } from "@/lib/api/withUser";
import db from "@/lib/db";
import { UpdateAllocationPresetPayload } from "@/types/allocation";

type Params = Promise<{
    id: string;
}>;

export const GET = withUser<Params>(async (_req, context, user) => {
    try {
        const { id } = await context.params!;

        const result = await db.query(
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
                                'destinationAccountName', destination_name,
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
                WHERE p.id = $1
                AND p.user_id = $2
                GROUP BY
                    p.id,
                    source.name
            `,
            [id, user.id]
        );

        if (result.length === 0) return jsonError("Preset not found.", 404);

        return jsonOk({ preset: result[0] });
    } catch (err) {
        return serverError("GET /api/allocation/presets/[id]", err);
    }
});

export const PATCH = withUser<Params>(async (req, context, user) => {
    try {
        const { id } = await context.params!;

        const body = (await req.json()) as UpdateAllocationPresetPayload;

        const name = cleanString(body.name);
        const sourceAccountId = cleanString(body.sourceAccontId);
        const rules = Array.isArray(body.rules) ? body.rules : [];

        if (!name) return jsonError("Preset name is required.", 400);

        if (!sourceAccountId) return jsonError("Source account is required.", 400);

        if (rules.length === 0) return jsonError("At least one allocation rule is required.", 400);

        const existingPreset = await db.query(
            `
                SELECT id
                FROM allocation_presets
                WHERE id = $1
                AND user_id = $2
                LIMIT 1
            `,
            [id, user.id]
        );

        if (existingPreset.length === 0) return jsonError("Preset not found.", 404);

        const duplicateName = await db.query(
            `
                SELECT id
                FROM allocation_presets
                WHERE user_id = $1
                AND LOWER(name) = LOWER($2)
                AND id <> $3
                LIMIT 1
            `,
            [user.id, name, id]
        );

        if (duplicateName.length > 0) return jsonError("You already have a preset with that name.", 409);

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

        if (totalPercentage > 100) return jsonError("Total percentage allocations cannot exceed 100%.", 400);

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
                WITH updated_preset AS (
                    UPDATE allocation_presets
                    SET
                        name = $3,
                        source_account_id = $4,
                        updated_at = NOW()
                    WHERE id = $1
                    AND user_id = $2
                    RETURNING id
                ),
                deleted_rules AS (
                    DELETE FROM allocation_rules
                    WHERE preset_id IN (
                        SELECT id
                        FROM updated_preset
                    )
                ),
                rule_data AS (
                    SELECT
                        destination_account_id,
                        fixed_amount,
                        percentage,
                        sort_order
                    FROM JSONB_TO_RECORDSET($5::jsonb) AS x(
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
                        updated_preset.id,
                        rule_data.destination_account_id,
                        rule_data.fixed_amount,
                        rule_data.percentage,
                        rule_data.sort_order
                    FROM updated_preset
                    CROSS JOIN rule_data
                    RETURNING id
                )
                SELECT id
                FROM updated_preset
            `,
            [id, user.id, name, sourceAccountId, JSON.stringify(
                rules.map((rule, index) => ({
                    destination_account_id: rule.destinationAccountId,
                    fixed_amount: Number(rule.fixedAmount),
                    percentage: Number(rule.percentage),
                    sort_order: index
                }))
            )]
        );

        if (result.length === 0) return jsonError("Preset not found.", 404);

        return jsonOk({
            success: true,
            presetId: result[0].id
        });
    } catch (err) {
        return serverError("PATCH /api/allocation/presets/[id]", err);
    }
});

export const DELETE = withUser<Params>(async (_req, context, user) => {
    try {
        const { id } = await context.params!;

        const result = await db.query(
            `
                DELETE FROM allocation_presets
                WHERE id = $1
                AND user_id = $2
                RETURNING id
            `,
            [id, user.id]
        );

        if (result.length === 0) return jsonError("Preset not found.", 404);

        return jsonOk({ success: true });
    } catch (err) {
        return serverError("DELETE /api/allocation/presets/[id]", err);
    }
});