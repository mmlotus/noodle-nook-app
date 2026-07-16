import { jsonError, jsonOk, serverError } from "@/lib/api/apiUtils";
import { withUser } from "@/lib/api/withUser";
import { cleanBudgetMonthAmount, cleanOptionalBudgetMonthAmount, getBudgetMonthFromValue, getBudgetOccurrenceDatesForMonth } from "@/lib/budget";
import db from "@/lib/db";
import { BudgetRecurringItem } from "@/types/budget";

async function getBudgetMonthAndItems(userId: string, budgetId: string, budgetMonth: string) {
    const monthRows = await db.query(
        `
            SELECT
                id,
                user_id,
                budget_id,
                budget_month,
                starting_balance,
                savings_balance,
                generated_at,
                created_at,
                updated_at
            FROM budget_months
            WHERE user_id = $1
                AND budget_id = $2
                AND budget_month = $3
            LIMIT 1
        `,
        [userId, budgetId, budgetMonth]
    );

    if (monthRows.length === 0) {
        return {
            month: null,
            items: [],
        };
    }

    const items = await db.query(
        `
            SELECT
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
            FROM budget_monthly_items
            WHERE user_id = $1
                AND budget_month_id = $2
            ORDER BY
                item_type ASC,
                item_date ASC NULLS LAST,
                sort_order ASC,
                name ASC,
                created_at ASC
        `,
        [userId, monthRows[0].id]
    );

    return {
        month: monthRows[0],
        items,
    };
}

export const GET = withUser(async (req, _context, user) => {
    try {
        const { searchParams } = new URL(req.url);
        const monthParam = searchParams.get("month");
        const budgetId = searchParams.get("budgetId");

        if (!monthParam) {
            return jsonError("Budget month is required.", 400);
        }

        if (!budgetId) {
            return jsonError("Budget ID is required.", 400);
        }

        const budgetMonth = getBudgetMonthFromValue(monthParam);
        const data = await getBudgetMonthAndItems(user.id, budgetId, budgetMonth);

        return jsonOk(data);
    } catch (err) {
        if (err instanceof Error) {
            return jsonError(err.message, 400);
        }

        return serverError("GET /api/budget/month", err);
    }
});

export const POST = withUser(async (req, _context, user) => {
    try {
        const body = await req.json();
        const budgetId = typeof body.budgetId === "string" ? body.budgetId.trim() : "";

        if (!budgetId) return jsonError("Budget ID is required.", 400);

        const budgetMonth = getBudgetMonthFromValue(String(body.month || ""));
        const startingBalance = cleanBudgetMonthAmount(body.starting_balance, 0);
        const savingsBalance = cleanOptionalBudgetMonthAmount(body.savings_balance);

        const existing = await getBudgetMonthAndItems(user.id, budgetId, budgetMonth);

        if (existing.month && existing.items.length > 0) {
            return jsonOk({
                success: true,
                alreadyGenerated: true,
                month: existing.month,
                items: existing.items,
            });
        }

        const monthResult = await db.query(
            `
                INSERT INTO budget_months (
                    user_id,
                    budget_id,
                    budget_month,
                    starting_balance,
                    savings_balance,
                    updated_at
                )
                SELECT
                    $1,
                    b.id,
                    $3,
                    $4,
                    $5,
                    NOW()
                FROM budgets b
                WHERE b.id = $2
                    AND b.owner_user_id = $1
                    AND b.is_active = true
                ON CONFLICT (user_id, budget_id, budget_month)
                DO UPDATE SET updated_at = budget_months.updated_at
                RETURNING
                    id,
                    user_id,
                    budget_id,
                    budget_month,
                    starting_balance,
                    savings_balance,
                    generated_at,
                    created_at,
                    updated_at
            `,
            [user.id, budgetId, budgetMonth, startingBalance, savingsBalance]
        );

        if (monthResult.length === 0) return jsonError("Budget month could not be created.", 400);

        const budgetMonthRow = monthResult[0];

        const recurringItems = await db.query(
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
                    AND is_active = true
                ORDER BY
                    item_type ASC,
                    sort_order ASC,
                    day_of_month ASC NULLS LAST,
                    name ASC
            `,
            [user.id, budgetId]
        ) as BudgetRecurringItem[];

        let createdCount = 0;

        for (const item of recurringItems) {
            const occurrenceDates = getBudgetOccurrenceDatesForMonth({
                item,
                budgetMonth,
            });

            for (let index = 0; index < occurrenceDates.length; index += 1) {
                const occurrenceDate = occurrenceDates[index];

                await db.query(
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
                            status,
                            notes,
                            is_one_time,
                            sort_order,
                            updated_at
                        )
                        VALUES (
                            $1, $2, $3, $4, $5,
                            $6, $7, $8, 'pending', $9,
                            false, $10, NOW()
                        )
                    `,
                    [
                        user.id,
                        budgetId,
                        budgetMonthRow.id,
                        item.id,
                        occurrenceDates.length > 1 ? `${item.name} #${index + 1}` : item.name,
                        item.item_type,
                        occurrenceDate,
                        item.expected_amount,
                        item.notes,
                        Number(item.sort_order || 0) * 100 + index,
                    ]
                );

                createdCount += 1;
            }
        }

        const finalData = await getBudgetMonthAndItems(user.id, budgetId, budgetMonth);

        return jsonOk({
            success: true,
            alreadyGenerated: false,
            createdCount,
            month: finalData.month,
            items: finalData.items,
        });
    } catch (err) {
        if (err instanceof Error) {
            return jsonError(err.message, 400);
        }

        return serverError("POST /api/budget/month", err);
    }
});

export const PATCH = withUser(async (req, _context, user) => {
    try {
        const body = await req.json();
        const budgetId = typeof body.budgetId === "string" ? body.budgetId.trim() : "";

        if (!budgetId) return jsonError("Budget ID is required.", 400);

        const budgetMonth = getBudgetMonthFromValue(String(body.month || ""));
        const startingBalance = cleanBudgetMonthAmount(body.starting_balance, 0);
        const savingsBalance = cleanOptionalBudgetMonthAmount(body.savings_balance);

        const result = await db.query(
            `
                UPDATE budget_months
                SET
                    starting_balance = $1,
                    savings_balance = $2,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = $3
                    AND budget_id = $4
                    AND budget_month = $5
                RETURNING
                    id,
                    user_id,
                    budget_id,
                    budget_month,
                    starting_balance,
                    savings_balance,
                    generated_at,
                    created_at,
                    updated_at
            `,
            [startingBalance, savingsBalance, user.id, budgetId, budgetMonth]
        );

        if (result.length === 0) {
            return jsonError("Budget month not found.", 404);
        }

        return jsonOk({
            success: true,
            month: result[0],
        });
    } catch (err) {
        if (err instanceof Error) {
            return jsonError(err.message, 400);
        }

        return serverError("PATCH /api/budget/month", err);
    }
});