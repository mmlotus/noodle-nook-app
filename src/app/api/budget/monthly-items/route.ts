import { getTodayDateString } from "@/app/utils/formatDate";
import { cleanString, jsonError, jsonOk, serverError } from "@/lib/api/apiUtils";
import { withUser } from "@/lib/api/withUser";
import { cleanBudgetMonthlyStatus, cleanOptionalBudgetAmount, cleanOptionalBudgetDate, cleanRequiredBudgetAmount } from "@/lib/budget";
import db from "@/lib/db";

export const POST = withUser(async (req, _context, user) => {
    try {
        const body = await req.json();

        const budgetId = cleanString(body.budgetId);

        if (!budgetId) return jsonError("Budget ID is required.", 400);

        const budgetMonthId = cleanString(body.budget_month_id);
        const name = cleanString(body.name);
        const itemType = cleanString(body.item_type);
        const itemDate = cleanOptionalBudgetDate(body.item_date);
        const expectedAmount = cleanRequiredBudgetAmount(body.expected_amount);
        const notes = cleanString(body.notes);

        if (!budgetMonthId) return jsonError("Budget month is required.", 400);

        if (!name) return jsonError("Name is required.", 400);

        if (itemType !== "income" && itemType !== "bill" && itemType !== "expected_expense") {
            return jsonError("Invalid item type.", 400);
        }

        const monthCheck = await db.query(
            `
                SELECT id
                FROM budget_months
                WHERE id = $1
                    AND user_id = $2
                    AND budget_id = $3
                LIMIT 1
            `,
            [budgetMonthId, user.id, budgetId]
        );

        if (monthCheck.length === 0) return jsonError("Budget month not found.", 404);

        const result = await db.query(
            `
                INSERT INTO budget_monthly_items (
                    user_id,
                    budget_id,
                    budget_month_id,
                    recurring_item_id,
                    name,
                    item_type,
                    item_date,
                    expected_amount,
                    actual_amount,
                    status,
                    completed_date,
                    notes,
                    is_one_time,
                    sort_order,
                    updated_at
                )
                VALUES (
                    $1, $2, $3, NULL, $4,
                    $5, $6, $7, NULL, 'pending',
                    NULL, $8, true, 0, CURRENT_TIMESTAMP
                )
                RETURNING
                    id,
                    user_id,
                    budget_id,
                    budget_month_id,
                    recurring_item_id,
                    name,
                    item_type,
                    item_date,
                    expected_amount,
                    actual_amount,
                    status,
                    completed_date,
                    notes,
                    is_one_time,
                    sort_order,
                    created_at,
                    updated_at
            `,
            [
                user.id,
                budgetId,
                budgetMonthId,
                name,
                itemType,
                itemDate,
                expectedAmount,
                notes,
            ]
        );

        if (result.length === 0) return jsonError("Monthly item was not created.", 400);

        return jsonOk({ success: true, item: result[0] });
    } catch (err) {
        if (err instanceof Error) return jsonError(err.message, 400);

        return serverError("POST /api/budget/monthly-items", err);
    }
});

export const PATCH = withUser(async (req, _context, user) => {
    try {
        const body = await req.json();

        const budgetId = cleanString(body.budgetId);

        if (!budgetId) return jsonError("Budget ID is required.", 400);
        
        const id = cleanString(body.id);

        if (!id) return jsonError("Invalid monthly budget item ID.", 400);

        const name = cleanString(body.name);
        const status = cleanBudgetMonthlyStatus(body.status);
        const itemDate = cleanOptionalBudgetDate(body.item_date);
        const completedDate = cleanOptionalBudgetDate(body.completed_date);
        const actualAmount = cleanOptionalBudgetAmount(body.actual_amount);
        const expectedAmount = cleanRequiredBudgetAmount(body.expected_amount);
        const notes = cleanString(body.notes);

        if (!name) return jsonError("Name is required.", 400);

        const finalActualAmount = status === "skipped"
            ? 0
            : status === "completed" && actualAmount === null
                ? expectedAmount
                : actualAmount;

        const finalCompletedDate = status === "pending" ? null : completedDate || getTodayDateString();

        const result = await db.query(
            `
                UPDATE budget_monthly_items AS bmi
                SET
                    name = $1,
                    item_date = $2,
                    expected_amount = $3,
                    actual_amount = $4,
                    status = $5,
                    completed_date = $6,
                    notes = $7,
                    updated_at = CURRENT_TIMESTAMP
                FROM budget_months bm
                WHERE bmi.id = $8
                    AND bmi.user_id = $9
                    AND bm.id = bmi.budget_month_id
                    AND bm.budget_id = $10
                    AND bm.user_id = $9
                RETURNING
                    bmi.id,
                    bmi.user_id,
                    bmi.budget_id,
                    bmi.budget_month_id,
                    bmi.recurring_item_id,
                    bmi.name,
                    bmi.item_type,
                    bmi.item_date,
                    bmi.expected_amount,
                    bmi.actual_amount,
                    bmi.status,
                    bmi.completed_date,
                    bmi.notes,
                    bmi.is_one_time,
                    bmi.sort_order,
                    bmi.created_at,
                    bmi.updated_at
            `,
            [
                name,
                itemDate,
                expectedAmount,
                finalActualAmount,
                status,
                finalCompletedDate,
                notes,
                id,
                user.id,
                budgetId,
            ]
        );

        if (result.length === 0) return jsonError("Monthly budget item not found.", 404);

        return jsonOk({ success: true, item: result[0] });
    } catch (err) {
        if (err instanceof Error) return jsonError(err.message, 400);

        return serverError("PATCH /api/budget/monthly-items", err);
    }
});

export const DELETE = withUser(async (req, _context, user) => {
    try {
        const body = await req.json();

        const budgetId = cleanString(body.budgetId);

        if (!budgetId) return jsonError("Budget ID is required.", 400);

        const id = cleanString(body.id);

        if (!id) return jsonError("Invalid monthly budget item ID.", 400);

        const result = await db.query(
            `
                DELETE FROM budget_monthly_items bmi
                USING budget_months bm
                WHERE bmi.id = $1
                    AND bmi.user_id = $2
                    AND bmi.is_one_time = true
                    AND bm.id = bmi.budget_month_id
                    AND bm.user_id = $2
                    AND bm.budget_id = $3
                RETURNING bmi.id
            `,
            [id, user.id, budgetId]
        );

        if (result.length === 0) return jsonError("One-time monthly item not found.", 404);

        return jsonOk({ success: true });
    } catch (err) {
        if (err instanceof Error) return jsonError(err.message, 400);

        return serverError("DELETE /api/budget/monthly-items", err);
    }
});