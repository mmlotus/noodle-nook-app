import { jsonError, jsonOk, serverError } from "@/lib/api/apiUtils";
import { withUser } from "@/lib/api/withUser";
import { validateBudgetRecurringPayload } from "@/lib/budget";
import db from "@/lib/db";
import { BudgetRecurringCreatePayload, BudgetRecurringUpdatePayload } from "@/types/budget";

function isValidId(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
}

export const GET = withUser(async (req, _context, user) => {
    try {
        const { searchParams } = new URL(req.url);
        const budgetId = searchParams.get("budgetId");

        if (!budgetId) return jsonError("Budget ID is required.", 400);

        const result = await db.query(
            `
                SELECT
                    id,
                    user_id,
                    budget_id,
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
                FROM budget_recurring_items
                WHERE user_id = $1
                    AND budget_id = $2
                ORDER BY
                    is_active DESC,
                    item_type ASC,
                    sort_order ASC,
                    day_of_month ASC NULLS LAST,
                    name ASC
            `,
            [user.id, budgetId]
        );

        return jsonOk({ items: result });
    } catch (err) {
        return serverError("GET /api/budget/recurring", err);
    }
});

export const POST = withUser(async (req, _context, user) => {
    try {
        const body = (await req.json()) as BudgetRecurringCreatePayload;
        const budgetId = body.budgetId;

        if (!isValidId(budgetId)) return jsonError("Invalid budget ID.", 400);

        const validated = validateBudgetRecurringPayload(body);

        const result = await db.query(
            `
                INSERT INTO budget_recurring_items (
                    user_id,
                    budget_id,
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
                SELECT
                    $1, b.id, $3, $4, $5,
                    $6, $7, $8, $9, $10,
                    $11, $12, $13, $14, NOW()
                FROM budgets b
                WHERE b.id = $2
                    AND b.owner_user_id = $1
                RETURNING
                    id,
                    user_id,
                    budget_id,
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
                budgetId,
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
            return jsonError("Budget was not found or recurring budget item was not created.", 404);
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

        if (!isValidId(body.id)) return jsonError("Invalid recurring budget item ID.", 400);

        if (!isValidId(body.budgetId)) return jsonError("Invalid budget ID.", 400);

        const validated = validateBudgetRecurringPayload(body);

        const result = await db.query(
            `
                UPDATE budget_recurring_items AS bri
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
                FROM budgets b
                WHERE bri.id = $13
                    AND bri.user_id = $14
                    AND bri.budget_id = $15
                    AND b.id = bri.budget_id
                    AND b.owner_user_id = $14
                RETURNING
                    bri.id,
                    bri.user_id,
                    bri.budget_id,
                    bri.name,
                    bri.item_type,
                    bri.frequency,
                    bri.custom_frequency_label,
                    bri.expected_amount,
                    bri.day_of_month,
                    bri.recurrence_anchor_date,
                    bri.start_date,
                    bri.end_date,
                    bri.is_active,
                    bri.notes,
                    bri.sort_order,
                    bri.created_at,
                    bri.updated_at
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
                body.budgetId,
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
        const body = (await req.json()) as {
            id?: unknown;
            budgetId?: unknown;
        };

        if (!isValidId(body.id)) return jsonError("Invalid recurring budget item ID.", 400);

        if (!isValidId(body.budgetId)) return jsonError("Invalid budget ID.", 400);

        const result = await db.query(
            `
                UPDATE budget_recurring_items AS bri
                SET
                    is_active = false,
                    updated_at = NOW()
                FROM budgets b
                WHERE bri.id = $1
                    AND bri.user_id = $2
                    AND bri.budget_id = $3
                    AND b.id = bri.budget_id
                    AND b.owner_user_id = $2
                RETURNING
                    bri.id,
                    bri.user_id,
                    bri.budget_id,
                    bri.name,
                    bri.item_type,
                    bri.frequency,
                    bri.custom_frequency_label,
                    bri.expected_amount,
                    bri.day_of_month,
                    bri.recurrence_anchor_date,
                    bri.start_date,
                    bri.end_date,
                    bri.is_active,
                    bri.notes,
                    bri.sort_order,
                    bri.created_at,
                    bri.updated_at
            `,
            [body.id, user.id, body.budgetId]
        );

        if (result.length === 0) return jsonError("Recurring budget item not found.", 404);

        return jsonOk({ success: true, item: result[0] });
    } catch (err) {
        return serverError("DELETE /api/budget/recurring", err);
    }
});