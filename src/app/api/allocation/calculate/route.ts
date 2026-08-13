import { jsonError, jsonOk, serverError } from "@/lib/api/apiUtils";
import { withUser } from "@/lib/api/withUser";
import db from "@/lib/db";
import { CalculateAllocationPayload } from "@/types/allocation";

export const POST = withUser(async (req, _context, user) => {
    try {
        const body = (await req.json()) as CalculateAllocationPayload;

        const presetId = typeof body.presetId === "string" ? body.presetId.trim() : "";
        const amountToAllocate = Number(body.amountToAllocate);

        if (!presetId) return jsonError("Preset is required.", 400);

        if (!Number.isFinite(amountToAllocate) || amountToAllocate <= 0) return jsonError("Amount to allocate must be greater than 0.", 400);

        const presetResult = await db.query(
            `
                SELECT
                    p.id,
                    p.name,
                    p.source_account_id AS "sourceAccountId",
                    source.name AS "sourceAccountName"
                FROM allocation_presets p
                JOIN allocation_accounts source
                    ON source.id = p.source_account_id
                WHERE p.id = $1
                AND p.user_id = $2
                LIMIT 1
            `,
            [presetId, user.id]
        );

        if (presetResult.length === 0) return jsonError("Preset not found.", 404);

        const preset = presetResult[0];

        const rules = await db.query(
            `
                SELECT
                    r.id,
                    r.destination_account_id AS "destinationAccountId",
                    destination.name AS "destinationAccountName",
                    r.fixed_amount::float AS "fixedAmount",
                    r.percentage::float AS "percentage",
                    r.sort_order AS "sortOrder"
                FROM allocation_rules r
                JOIN allocation_accounts destination
                    ON destination.id = r.destination_account_id
                WHERE r.preset_id = $1
                AND destination.user_id = $2
                ORDER BY r.sort_order ASC
            `,
            [presetId, user.id]
        );

        if (rules.length === 0) return jsonError("This preset has no allocation rules.", 400);

        const amountInCents = Math.round(amountToAllocate * 100);

        const results = rules.map((rule) => {
            const fixedAmount = Number(rule.fixedAmount);
            const percentage = Number(rule.percentage);

            const fixedCents = Math.round(fixedAmount * 100);
            const percentageCents = Math.round(amountInCents * (percentage / 100));
            const calculatedCents = fixedCents + percentageCents;

            return {
                destinationAccountId: rule.destinationAccountId,
                destinationAccountName: rule.destinationAccountName,
                fixedAmount,
                percentage,
                calculatedAmount: calculatedCents / 100
            };
        });

        const totalAllocatedCents = results.reduce((sum, result) =>
            sum + Math.round(result.calculatedAmount * 100),
            0
        );

        if (totalAllocatedCents > amountInCents) {
            const overAllocated = (totalAllocatedCents - amountInCents) / 100;

            return jsonError(
                `This preset allocates $${overAllocated.toFixed(2)} more than the available amount.`,
                400
            );
        }

        const amountRemainingCents = amountInCents - totalAllocatedCents;

        const calculationResult = await db.query(
            `
                INSERT INTO allocation_calculations (
                    user_id,
                    preset_id,
                    preset_name,
                    source_account_name,
                    amount_to_allocate,
                    total_allocated,
                    amount_remaining,
                    results
                )
                VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8::jsonb
                )
                RETURNING
                    id,
                    preset_id AS "presetId",
                    preset_name AS "presetName",
                    source_account_name AS "sourceAccountName",
                    amount_to_allocate::float AS "amountToAllocate",
                    total_allocated::float AS "totalAllocated",
                    amount_remaining::float AS "amountRemaining",
                    results,
                    created_at AS "createdAt"
            `,
            [user.id, preset.id, preset.name, preset.sourceAccountName,
            amountInCents / 100,
            totalAllocatedCents / 100,
            amountRemainingCents / 100,
            JSON.stringify(results)
            ]
        );

        await db.query(
            `
                DELETE FROM allocation_calculations
                WHERE user_id = $1
                AND id NOT IN (
                    SELECT id
                    FROM allocation_calculations
                    WHERE user_id = $1
                    ORDER BY created_at DESC, id DESC
                    LIMIT 50
                )
            `,
            [user.id]
        );

        return jsonOk({
            success: true,
            calculation: calculationResult[0]
        });
    } catch (err) {
        return serverError("POST /api/allocation/calculate", err);
    }
});