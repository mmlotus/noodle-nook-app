import {
    BudgetFrequency,
    budgetFrequencyOptions,
    BudgetItemType,
    BudgetMonthlyItem,
    BudgetMonthlyItemFormState,
    BudgetMonthlyStatus,
    BudgetRecurringCreatePayload,
    BudgetRecurringFormState,
    BudgetRecurringItem,
    BudgetRecurringUpdatePayload,
    ValidatedBudgetRecurringPayload,
} from "@/types/budget";
import { cleanString } from "./api/apiUtils";

/* CONSTANTS */

const validItemTypes: BudgetItemType[] = [
    "income",
    "bill",
    "expected_expense",
];

const validFrequencies: BudgetFrequency[] = [
    "weekly",
    "bi_weekly",
    "monthly",
    "bi_monthly",
    "quarterly",
    "semi_annual",
    "annual",
    "one_time",
    "custom",
];

const validBudgetMonthlyStatuses: BudgetMonthlyStatus[] = [
    "pending",
    "completed",
    "skipped",
];

/* CLEANERS / VALIDATION HELPERS */

function cleanOptionalDate(value: unknown): string | null {
    const cleaned = cleanString(value);

    if (!cleaned) return null;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
        throw new Error("Invalid date format.");
    }

    return cleaned;
}

function cleanExpectedAmount(value: unknown): number {
    const amount = Number(value);

    if (!Number.isFinite(amount) || amount < 0) {
        throw new Error("Expected amount must be a valid number.");
    }

    return Number(amount.toFixed(2));
}

function cleanDayOfMonth(value: unknown): number | null {
    if (value === null || value === undefined || value === "") return null;

    const day = Number(value);

    if (!Number.isInteger(day) || day < 1 || day > 31) {
        throw new Error("Pay/Due day must be between 1 and 31.");
    }

    return day;
}

function cleanSortOrder(value: unknown): number {
    if (value === null || value === undefined || value === "") return 0;

    const sortOrder = Number(value);

    if (!Number.isInteger(sortOrder)) {
        throw new Error("Sort order must be a whole number.");
    }

    return sortOrder;
}

function cleanBoolean(value: unknown, fallback: boolean): boolean {
    if (typeof value === "boolean") return value;
    return fallback;
}

export function cleanBudgetMonthlyStatus(value: unknown): BudgetMonthlyStatus {
    if (typeof value !== "string") {
        throw new Error("Invalid status.");
    }

    if (!validBudgetMonthlyStatuses.includes(value as BudgetMonthlyStatus)) {
        throw new Error("Invalid status.");
    }

    return value as BudgetMonthlyStatus;
}

export function cleanOptionalBudgetDate(value: unknown): string | null {
    return cleanOptionalDate(value);
}

export function cleanOptionalBudgetAmount(value: unknown) {
    if (value === null || value === undefined || value === "") return null;

    return cleanExpectedAmount(value);
}

export function cleanRequiredBudgetAmount(value: unknown) {
    return cleanExpectedAmount(value);
}

export function cleanBudgetMonthAmount(value: unknown, fallback = 0) {
    if (value === null || value === undefined || value === "") return fallback;

    const amount = Number(value);

    if (!Number.isFinite(amount) || amount < 0) {
        throw new Error("Balance must be a valid number.");
    }

    return Number(amount.toFixed(2));
}

export function cleanOptionalBudgetMonthAmount(value: unknown) {
    if (value === null || value === undefined || value === "") return null;

    const amount = Number(value);

    if (!Number.isFinite(amount) || amount < 0) {
        throw new Error("Savings balance must be a valid number.");
    }

    return Number(amount.toFixed(2));
}

/* INTERNAL DATE / MONTH HELPERS */

/**
 * Budget recurrence math needs clean local date parsing.
 * This is intentionally not a display formatter and should not replace formatDate utilities.
 */
function parseDateOnly(value: string | Date) {
    if (value instanceof Date) {
        return new Date(
            value.getFullYear(),
            value.getMonth(),
            value.getDate()
        );
    }

    const cleanDate = String(value).slice(0, 10);
    const [year, month, day] = cleanDate.split("-").map(Number);

    return new Date(year, month - 1, day);
}

function formatDateOnly(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + days);
    return nextDate;
}

function getMonthDiff(fromDate: Date, toDate: Date) {
    return (
        (toDate.getFullYear() - fromDate.getFullYear()) * 12 +
        (toDate.getMonth() - fromDate.getMonth())
    );
}

function getMonthKey(value: string | Date) {
    if (value instanceof Date) {
        return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
    }

    return String(value).slice(0, 7);
}

function getMonthStart(budgetMonth: string) {
    return parseDateOnly(budgetMonth);
}

function getMonthEnd(budgetMonth: string) {
    const monthStart = getMonthStart(budgetMonth);

    return new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
}

function getMonthLastDay(budgetMonth: string) {
    const monthStart = getMonthStart(budgetMonth);

    return new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
}

function isItemActiveForMonth(params: {
    startDate: string | Date | null | undefined;
    endDate: string | Date | null | undefined;
    budgetMonth: string;
}) {
    const { startDate, endDate, budgetMonth } = params;

    const monthStart = getMonthStart(budgetMonth);
    const monthEnd = getMonthEnd(budgetMonth);

    if (startDate && parseDateOnly(startDate) >= monthEnd) {
        return false;
    }

    if (endDate && parseDateOnly(endDate) < monthStart) {
        return false;
    }

    return true;
}

function getClampedDateForMonth(
    budgetMonth: string,
    preferredDay: number | null | undefined
) {
    const monthStart = getMonthStart(budgetMonth);
    const lastDay = getMonthLastDay(budgetMonth).getDate();

    if (!preferredDay) return null;

    const safeDay = Math.min(Math.max(preferredDay, 1), lastDay);

    return new Date(monthStart.getFullYear(), monthStart.getMonth(), safeDay);
}

function getPreferredDay(item: BudgetRecurringItem) {
    if (item.day_of_month) return item.day_of_month;

    if (item.start_date) {
        return parseDateOnly(item.start_date).getDate();
    }

    return null;
}

/* RECURRING ITEM VALIDATION */

export function validateBudgetRecurringPayload(
    payload: BudgetRecurringCreatePayload | BudgetRecurringUpdatePayload
): ValidatedBudgetRecurringPayload {
    const name = cleanString(payload.name);

    if (!name) throw new Error("Name is required.");

    if (!validItemTypes.includes(payload.item_type)) {
        throw new Error("Invalid budget item type.");
    }

    if (!validFrequencies.includes(payload.frequency)) {
        throw new Error("Invalid budget frequency.");
    }

    const startDate = cleanOptionalDate(payload.start_date);
    const endDate = cleanOptionalDate(payload.end_date);

    if (startDate && endDate && endDate < startDate) {
        throw new Error("End date cannot be before start date.");
    }

    return {
        name,
        itemType: payload.item_type,
        frequency: payload.frequency,
        customFrequencyLabel: cleanString(payload.custom_frequency_label),
        expectedAmount: cleanExpectedAmount(payload.expected_amount),
        dayOfMonth: cleanDayOfMonth(payload.day_of_month),
        recurrenceAnchorDate: cleanOptionalDate(payload.recurrence_anchor_date),
        startDate,
        endDate,
        isActive: cleanBoolean(payload.is_active, true),
        notes: cleanString(payload.notes),
        sortOrder: cleanSortOrder(payload.sort_order),
    };
}

/* DISPLAY LABEL HELPERS */

export function getBudgetItemTypeLabel(itemType: BudgetItemType) {
    if (itemType === "income") return "Income";
    if (itemType === "bill") return "Bill";
    return "Expected Expense";
}

export function getBudgetDateLabel(itemType: BudgetItemType) {
    return itemType === "income" ? "Pay Date" : "Due Date";
}

export function normalizeBudgetDate(value: string | null | undefined) {
    if (!value) return "";
    return value.split("T")[0];
}

export function getBudgetFrequencyLabel(item: BudgetRecurringItem) {
    if (item.frequency === "custom" && item.custom_frequency_label) {
        return item.custom_frequency_label;
    }

    return (
        budgetFrequencyOptions.find((option) => option.value === item.frequency)?.label ||
        item.frequency
    );
}

export function getBudgetDayDisplay(item: BudgetRecurringItem) {
    if (!item.day_of_month) return "-";
    return String(item.day_of_month);
}

/* RECURRING ITEM FORM HELPERS */

export function budgetRecurringItemToForm(
    item: BudgetRecurringItem
): BudgetRecurringFormState {
    return {
        id: item.id,
        name: item.name,
        item_type: item.item_type,
        frequency: item.frequency,
        custom_frequency_label: item.custom_frequency_label || "",
        expected_amount: String(item.expected_amount ?? ""),
        day_of_month: item.day_of_month ? String(item.day_of_month) : "",
        recurrence_anchor_date: normalizeBudgetDate(item.recurrence_anchor_date),
        start_date: normalizeBudgetDate(item.start_date),
        end_date: normalizeBudgetDate(item.end_date),
        is_active: item.is_active,
        notes: item.notes || "",
        sort_order: String(item.sort_order ?? 0),
    };
}

export function budgetRecurringFormToPayload(form: BudgetRecurringFormState) {
    return {
        id: form.id,
        name: form.name,
        item_type: form.item_type,
        frequency: form.frequency,
        custom_frequency_label: form.custom_frequency_label || null,
        expected_amount: form.expected_amount,
        day_of_month: form.day_of_month || null,
        recurrence_anchor_date: form.start_date || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        is_active: form.is_active,
        notes: form.notes || null,
        sort_order: form.sort_order || 0,
    };
}

/* MONTHLY ITEM FORM HELPERS */

export function buildBudgetMonthlyItemForm(
    item: BudgetMonthlyItem
): BudgetMonthlyItemFormState {
    return {
        id: item.id,
        name: item.name,
        item_date: normalizeBudgetDate(item.item_date),
        expected_amount: String(item.expected_amount ?? ""),
        actual_amount: item.actual_amount === null ? "" : String(item.actual_amount),
        status: item.status,
        completed_date: normalizeBudgetDate(item.completed_date),
        notes: item.notes || "",
    };
}

export function getBudgetMonthlyItemActualForTotals(item: BudgetMonthlyItem) {
    if (item.status === "pending") return 0;

    return Number(item.actual_amount || 0);
}

export function getBudgetMonthlyItemDifference(item: BudgetMonthlyItem) {
    const expected = Number(item.expected_amount || 0);
    const actual = getBudgetMonthlyItemActualForTotals(item);

    if (item.item_type === "income") {
        return actual - expected;
    }

    return expected - actual;
}

export function getBudgetMonthlyFormDifference(params: {
    itemType: BudgetItemType;
    form: BudgetMonthlyItemFormState;
}) {
    const expected = Number(params.form.expected_amount || 0);
    const actual =
        params.form.status === "pending"
            ? 0
            : Number(params.form.actual_amount || 0);

    if (params.itemType === "income") {
        return actual - expected;
    }

    return expected - actual;
}

export function getBudgetCurrentMonthValue() {
    const today = new Date();

    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
}

export function getBudgetPreviousMonthValue(monthValue: string) {
    const monthStart = parseDateOnly(getBudgetMonthFromValue(monthValue));
    const previousMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1);

    return `${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, "0")}`;
}

export function getBudgetNextMonthValue(monthValue: string) {
    const monthStart = parseDateOnly(getBudgetMonthFromValue(monthValue));
    const nextMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);

    return `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;
}

export function getBudgetCalendarDays(monthValue: string) {
    const budgetMonth = getBudgetMonthFromValue(monthValue);
    const monthStart = getMonthStart(budgetMonth);
    const monthEnd = getMonthEnd(budgetMonth);

    const firstGridDate = new Date(monthStart);
    firstGridDate.setDate(firstGridDate.getDate() - firstGridDate.getDay());

    const lastGridDate = new Date(monthEnd);
    const trailingDays = 6 - lastGridDate.getDay();
    lastGridDate.setDate(lastGridDate.getDate() + trailingDays);

    const days = [];
    let currentDate = new Date(firstGridDate);

    while (currentDate <= lastGridDate) {
        days.push({
            date: formatDateOnly(currentDate),
            dayNumber: currentDate.getDate(),
            isCurrentMonth: currentDate.getMonth() === monthStart.getMonth(),
        });

        currentDate = addDays(currentDate, 1);
    }

    return days;
}

export function getBudgetItemsForDate(
    items: BudgetMonthlyItem[],
    date: string
) {
    return items.filter((item) => normalizeBudgetDate(item.item_date) === date);
}

export function buildBudgetMonthlyItemFormMap(items: BudgetMonthlyItem[]) {
    return items.reduce((acc, item) => {
        acc[item.id] = buildBudgetMonthlyItemForm(item);
        return acc;
    }, {} as Record<string, BudgetMonthlyItemFormState>);
}

export function getBudgetMonthlySummary(items: BudgetMonthlyItem[]) {
    const incomeItems = items.filter((item) => item.item_type === "income");
    const expenseItems = items.filter((item) => item.item_type !== "income");

    const expectedIncome = incomeItems.reduce(
        (total, item) => total + Number(item.expected_amount || 0),
        0
    );

    const actualIncome = incomeItems.reduce(
        (total, item) => total + getBudgetMonthlyItemActualForTotals(item),
        0
    );

    const expectedExpenses = expenseItems.reduce(
        (total, item) => total + Number(item.expected_amount || 0),
        0
    );

    const actualExpenses = expenseItems.reduce(
        (total, item) => total + getBudgetMonthlyItemActualForTotals(item),
        0
    );

    return {
        expectedIncome,
        actualIncome,
        expectedExpenses,
        actualExpenses,
        expectedRemaining: expectedIncome - expectedExpenses,
        actualRemaining: actualIncome - actualExpenses,
    };
}

/* MONTH VALUE HELPERS */

export function getBudgetMonthFromValue(value: string) {
    if (!/^\d{4}-\d{2}$/.test(value) && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new Error("Invalid budget month.");
    }

    return `${value.slice(0, 7)}-01`;
}

/* RECURRING TOTAL / OCCURRENCE COUNT HELPERS */

export function getBudgetRecurringMonthlyEstimate(params: {
    expectedAmount: number | string | null | undefined;
    frequency: BudgetFrequency;
}) {
    const amount = Number(params.expectedAmount || 0);

    if (params.frequency === "weekly") return amount * 4;
    if (params.frequency === "bi_weekly") return amount * 2;
    if (params.frequency === "monthly") return amount;
    if (params.frequency === "bi_monthly") return amount / 2;
    if (params.frequency === "quarterly") return amount / 3;
    if (params.frequency === "semi_annual") return amount / 6;
    if (params.frequency === "annual") return amount / 12;

    return amount;
}

export function getIncomeOccurrenceCountForMonth(params: {
    frequency: BudgetFrequency;
    startDate: string | null | undefined;
    budgetMonth: string;
}) {
    const { frequency, startDate, budgetMonth } = params;

    if (!startDate) {
        if (frequency === "weekly") return 4;
        if (frequency === "bi_weekly") return 2;
        return 1;
    }

    if (frequency !== "weekly" && frequency !== "bi_weekly") {
        return 1;
    }

    const monthStart = parseDateOnly(budgetMonth);
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);

    let occurrenceDate = parseDateOnly(startDate);
    const stepDays = frequency === "weekly" ? 7 : 14;

    if (Number.isNaN(occurrenceDate.getTime())) {
        if (frequency === "weekly") return 4;
        if (frequency === "bi_weekly") return 2;
        return 1;
    }

    while (occurrenceDate < monthStart) {
        occurrenceDate = addDays(occurrenceDate, stepDays);
    }

    let count = 0;

    while (occurrenceDate < monthEnd) {
        count += 1;
        occurrenceDate = addDays(occurrenceDate, stepDays);
    }

    return count;
}

export function getBillExpenseOccurrenceCountForMonth(params: {
    frequency: BudgetFrequency;
    startDate: string | null | undefined;
    endDate?: string | null | undefined;
    budgetMonth: string;
}) {
    const { frequency, startDate, endDate, budgetMonth } = params;

    if (!isItemActiveForMonth({ startDate, endDate, budgetMonth })) {
        return 0;
    }

    if (!startDate) {
        if (frequency === "weekly") return 4;
        if (frequency === "bi_weekly") return 2;
        if (frequency === "monthly") return 1;
        return 0;
    }

    const monthStart = getMonthStart(budgetMonth);
    const monthEnd = getMonthEnd(budgetMonth);
    const monthLastDay = getMonthLastDay(budgetMonth);
    const itemStart = parseDateOnly(startDate);

    if (Number.isNaN(itemStart.getTime())) {
        if (frequency === "weekly") return 4;
        if (frequency === "bi_weekly") return 2;
        if (frequency === "monthly") return 1;
        return 0;
    }

    if (frequency === "one_time" || frequency === "custom") {
        return getMonthKey(startDate) === getMonthKey(budgetMonth) ? 1 : 0;
    }

    if (frequency === "monthly") {
        return itemStart <= monthLastDay ? 1 : 0;
    }

    if (frequency === "bi_monthly") {
        const diff = getMonthDiff(itemStart, monthStart);
        return diff >= 0 && diff % 2 === 0 ? 1 : 0;
    }

    if (frequency === "quarterly") {
        const diff = getMonthDiff(itemStart, monthStart);
        return diff >= 0 && diff % 3 === 0 ? 1 : 0;
    }

    if (frequency === "semi_annual") {
        const diff = getMonthDiff(itemStart, monthStart);
        return diff >= 0 && diff % 6 === 0 ? 1 : 0;
    }

    if (frequency === "annual") {
        return itemStart.getMonth() === monthStart.getMonth() ? 1 : 0;
    }

    if (frequency === "weekly" || frequency === "bi_weekly") {
        const stepDays = frequency === "weekly" ? 7 : 14;
        let occurrenceDate = itemStart;

        while (occurrenceDate < monthStart) {
            occurrenceDate = addDays(occurrenceDate, stepDays);
        }

        let count = 0;

        while (occurrenceDate < monthEnd) {
            if (!endDate || occurrenceDate <= parseDateOnly(endDate)) {
                count += 1;
            }

            occurrenceDate = addDays(occurrenceDate, stepDays);
        }

        return count;
    }

    return 1;
}

export function getBudgetRecurringGroupEstimate(params: {
    itemType: BudgetItemType;
    expectedAmount: number | string | null | undefined;
    frequency: BudgetFrequency;
    startDate: string | null | undefined;
    endDate?: string | null | undefined;
    budgetMonth: string;
}) {
    const amount = Number(params.expectedAmount || 0);

    if (params.itemType === "income") {
        return amount * getIncomeOccurrenceCountForMonth({
            frequency: params.frequency,
            startDate: params.startDate,
            budgetMonth: params.budgetMonth,
        });
    }

    return amount * getBillExpenseOccurrenceCountForMonth({
        frequency: params.frequency,
        startDate: params.startDate,
        endDate: params.endDate,
        budgetMonth: params.budgetMonth,
    });
}

/* MONTH GENERATION HELPERS */

export function getBudgetOccurrenceDatesForMonth(params: {
    item: BudgetRecurringItem;
    budgetMonth: string;
}) {
    const { item, budgetMonth } = params;

    const startDate = item.start_date as string | Date | null;
    const endDate = item.end_date as string | Date | null;

    if (!isItemActiveForMonth({ startDate, endDate, budgetMonth })) {
        return [];
    }

    const monthStart = getMonthStart(budgetMonth);
    const monthEnd = getMonthEnd(budgetMonth);
    const preferredDay = getPreferredDay(item);

    if (!startDate) {
        const fallbackDate = getClampedDateForMonth(budgetMonth, preferredDay);

        if (fallbackDate) return [formatDateOnly(fallbackDate)];

        return [budgetMonth];
    }

    const itemStart = parseDateOnly(startDate);

    if (Number.isNaN(itemStart.getTime())) {
        const fallbackDate = getClampedDateForMonth(budgetMonth, preferredDay);
        return fallbackDate ? [formatDateOnly(fallbackDate)] : [budgetMonth];
    }

    if (item.frequency === "one_time" || item.frequency === "custom") {
        if (getMonthKey(startDate) !== getMonthKey(budgetMonth)) return [];

        if (startDate instanceof Date) {
            return [formatDateOnly(startDate)];
        }

        return [String(startDate).slice(0, 10)];
    }

    if (item.frequency === "weekly" || item.frequency === "bi_weekly") {
        const stepDays = item.frequency === "weekly" ? 7 : 14;
        let occurrenceDate = itemStart;
        const dates: string[] = [];

        while (occurrenceDate < monthStart) {
            occurrenceDate = addDays(occurrenceDate, stepDays);
        }

        while (occurrenceDate < monthEnd) {
            if (!endDate || occurrenceDate <= parseDateOnly(endDate)) {
                dates.push(formatDateOnly(occurrenceDate));
            }

            occurrenceDate = addDays(occurrenceDate, stepDays);
        }

        return dates;
    }

    if (item.frequency === "monthly") {
        if (itemStart >= monthEnd) return [];

        const occurrenceDate = getClampedDateForMonth(budgetMonth, preferredDay);

        return occurrenceDate ? [formatDateOnly(occurrenceDate)] : [budgetMonth];
    }

    if (item.frequency === "bi_monthly") {
        const diff = getMonthDiff(itemStart, monthStart);

        if (diff < 0 || diff % 2 !== 0) return [];

        const occurrenceDate = getClampedDateForMonth(budgetMonth, preferredDay);

        return occurrenceDate ? [formatDateOnly(occurrenceDate)] : [budgetMonth];
    }

    if (item.frequency === "quarterly") {
        const diff = getMonthDiff(itemStart, monthStart);

        if (diff < 0 || diff % 3 !== 0) return [];

        const occurrenceDate = getClampedDateForMonth(budgetMonth, preferredDay);

        return occurrenceDate ? [formatDateOnly(occurrenceDate)] : [budgetMonth];
    }

    if (item.frequency === "semi_annual") {
        const diff = getMonthDiff(itemStart, monthStart);

        if (diff < 0 || diff % 6 !== 0) return [];

        const occurrenceDate = getClampedDateForMonth(budgetMonth, preferredDay);

        return occurrenceDate ? [formatDateOnly(occurrenceDate)] : [budgetMonth];
    }

    if (item.frequency === "annual") {
        if (itemStart.getMonth() !== monthStart.getMonth()) return [];

        const occurrenceDate = getClampedDateForMonth(budgetMonth, preferredDay);

        return occurrenceDate ? [formatDateOnly(occurrenceDate)] : [budgetMonth];
    }

    return [budgetMonth];
}