import { jsonError, jsonOk, serverError } from "@/lib/api/apiUtils";
import { withUser } from "@/lib/api/withUser";
import { validateBudgetRecurringPayload } from "@/lib/budget";
import db from "@/lib/db";
import { BudgetRecurringCreatePayload, BudgetRecurringUpdatePayload } from "@/types/budget";

export const GET = withUser(async (_req, _context, user) => {
    try {
        const result = await db.query(
            `
                SELECT
                    id, user_id, name, item_type, frequency,
                    custom_frequency_label, expected_amount,
                    day_of_month, recurrence_anchor_date,
                    start_date, end_date, is_active, notes,
                    sort_order, created_at, updated_at
                FROM budget_recurring_items
                WHERE user_id = $1
                ORDER BY
                    is_active DESC,
                    item_type ASC,
                    sort_order ASC,
                    day_of_month ASC NULLS LAST,
                    name ASC
            `,
            [user.id]
        );

        return jsonOk({ items: result });
    } catch (err) {
        return serverError("GET /api/budget/recurring", err);
    }
});

export const POST = withUser(async (req, _context, user) => {
    try {
        const body = (await req.json()) as BudgetRecurringCreatePayload;
        const validated = validateBudgetRecurringPayload(body);

        const result = await db.query(
            `
                INSERT INTO budget_recurring_items (
                    user_id,
                    name,
                    item_type,
                    frequency,
                    custom_frequency_label,
                    expected_amount,
                    day_of_month,
                    recurrence_anchor_date,
                    start_date,
                    end_date,
                    is_active,
                    notes,
                    sort_order,
                    updated_at
                )
                VALUES (
                    $1, $2, $3, $4, $5,
                    $6, $7, $8, $9, $10,
                    $11, $12, $13, NOW()
                )
                RETURNING
                    id,
                    user_id,
                    name,
                    item_type,
                    frequency,
                    custom_frequency_label,
                    expected_amount,
                    day_of_month,
                    recurrence_anchor_date,
                    start_date,
                    end_date,
                    is_active,
                    notes,
                    sort_order,
                    created_at,
                    updated_at
            `,
            [
                user.id,
                validated.name,
                validated.itemType,
                validated.frequency,
                validated.customFrequencyLabel,
                validated.expectedAmount,
                validated.dayOfMonth,
                validated.recurrenceAnchorDate,
                validated.startDate,
                validated.endDate,
                validated.isActive,
                validated.notes,
                validated.sortOrder,
            ]
        );

        if (result.length === 0) {
            return jsonError("Recurring budget item was not created.", 400);
        }

        return jsonOk({ success: true, item: result[0] });
    } catch (err) {
        if (err instanceof Error) {
            return jsonError(err.message, 400);
        }

        return serverError("POST /api/budget/recurring", err);
    }
});

export const PATCH = withUser(async (req, _context, user) => {
    try {
        const body = (await req.json()) as BudgetRecurringUpdatePayload;

        if (!body.id || typeof body.id !== "string") return jsonError("Invalid recurring budget item ID.", 400);

        const validated = validateBudgetRecurringPayload(body);

        const result = await db.query(
            `
                UPDATE budget_recurring_items
                SET
                    name = $1,
                    item_type = $2,
                    frequency = $3,
                    custom_frequency_label = $4,
                    expected_amount = $5,
                    day_of_month = $6,
                    recurrence_anchor_date = $7,
                    start_date = $8,
                    end_date = $9,
                    is_active = $10,
                    notes = $11,
                    sort_order = $12,
                    updated_at = NOW()
                WHERE id = $13
                    AND user_id = $14
                RETURNING
                    id,
                    user_id,
                    name,
                    item_type,
                    frequency,
                    custom_frequency_label,
                    expected_amount,
                    day_of_month,
                    recurrence_anchor_date,
                    start_date,
                    end_date,
                    is_active,
                    notes,
                    sort_order,
                    created_at,
                    updated_at
            `,
            [
                validated.name,
                validated.itemType,
                validated.frequency,
                validated.customFrequencyLabel,
                validated.expectedAmount,
                validated.dayOfMonth,
                validated.recurrenceAnchorDate,
                validated.startDate,
                validated.endDate,
                validated.isActive,
                validated.notes,
                validated.sortOrder,
                body.id,
                user.id,
            ]
        );

        if (result.length === 0) return jsonError("Recurring budget item not found.", 404);

        return jsonOk({ success: true, item: result[0] });
    } catch (err) {
        if (err instanceof Error) {
            return jsonError(err.message, 400);
        }

        return serverError("PATCH /api/budget/recurring", err);
    }
});

export const DELETE = withUser(async (req, _context, user) => {
    try {
        const { id } = await req.json();

        if (!id || typeof id !== "string") return jsonError("Invalid reucrring budget item ID.", 400);

        const result = await db.query(
            `
                UPDATE budget_recurring_items
                SET
                    is_active = false,
                    updated_at = NOW()
                WHERE id = $1
                    AND user_id = $2
                RETURNING
                    id,
                    user_id,
                    name,
                    item_type,
                    frequency,
                    custom_frequency_label,
                    expected_amount,
                    day_of_month,
                    recurrence_anchor_date,
                    start_date,
                    end_date,
                    is_active,
                    notes,
                    sort_order,
                    created_at,
                    updated_at
            `,
            [id, user.id]
        );

        if (result.length === 0) return jsonError("Recurring budget item not found.", 404);

        return jsonOk({ success: true, item: result[0] });
    } catch (err) {
        return serverError("DELETE /api/budget/recurring", err);
    }
});