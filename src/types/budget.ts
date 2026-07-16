export type BudgetThemeKey =
    | "berries"
    | "azure"
    | "sage"
    | "seafoam"
    | "citrus"
    | "blush";

export type BudgetTheme = {
    key: BudgetThemeKey;
    label: string;
    pending: string;
    pendingText: string;
    completed: string;
    completedText: string;
    skipped: string;
    skippedText: string;
};

export type BudgetItemType = "income" | "bill" | "expected_expense";

export type BudgetFrequency =
    | "weekly"
    | "bi_weekly"
    | "monthly"
    | "bi_monthly"
    | "quarterly"
    | "semi_annual"
    | "annual"
    | "one_time"
    | "custom";

export type BudgetMonthlyStatus = "pending" | "completed" | "skipped";

export interface Budget {
    id: string;
    owner_user_id: string;
    name: string;
    color: string | null;
    theme_key: BudgetThemeKey;
    is_active: boolean;
    created_at: string;
    updated_at: string;
};

/* BUDGET RECURRING ITEMS */
export type BudgetRecurringItem = {
    id: string;
    user_id: string;
    budget_id: string;
    name: string;
    item_type: BudgetItemType;
    frequency: BudgetFrequency;
    custom_frequency_label: string | null;
    expected_amount: string;
    day_of_month: number | null;
    recurrence_anchor_date: string | null;
    start_date: string | null;
    end_date: string | null;
    is_active: boolean;
    notes: string | null;
    sort_order: number;
    created_at: string;
    updated_at: string;
};

export type BudgetRecurringCreatePayload = {
    budgetId: string;
    name: string;
    item_type: BudgetItemType;
    frequency: BudgetFrequency;
    custom_frequency_label?: string | null;
    expected_amount: number | string;
    day_of_month?: number | string | null;
    recurrence_anchor_date?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    is_active?: boolean;
    notes?: string | null;
    sort_order?: number | string | null;
};

export type BudgetRecurringUpdatePayload = BudgetRecurringCreatePayload & {
    id: string;
};

export type ValidatedBudgetRecurringPayload = {
    name: string;
    itemType: BudgetItemType;
    frequency: BudgetFrequency;
    customFrequencyLabel: string | null;
    expectedAmount: number;
    dayOfMonth: number | null;
    recurrenceAnchorDate: string | null;
    startDate: string | null;
    endDate: string | null;
    isActive: boolean;
    notes: string | null;
    sortOrder: number;
};


/* BUDGET MONTH */
export type BudgetMonth = {
    id: string;
    user_id: string;
    budget_id: string;
    budget_month: string;
    starting_balance: string;
    savings_balance: string | null;
    generated_at: string;
    created_at: string;
    updated_at: string;
};

export type BudgetMonthlyItem = {
    id: string;
    user_id: string;
    budget_id: string;
    budget_month_id: string;
    recurring_item_id: string | null;
    name: string;
    item_type: BudgetItemType;
    item_date: string | null;
    expected_amount: string;
    actual_amount: string | null;
    status: BudgetMonthlyStatus;
    completed_date: string | null;
    notes: string | null;
    is_one_time: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
};

export type BudgetCalendarDay = {
    date: string;
    dayNumber: number;
    isCurrentMonth: boolean;
};

export type BudgetMonthlySummary = {
    expectedIncome: number;
    actualIncome: number;
    expectedExpenses: number;
    actualExpenses: number;
    expectedRemaining: number;
    actualRemaining: number;
};


/* FORM SPECIFIC */
export type BudgetRecurringFormState = {
    id: string;
    name: string;
    item_type: BudgetItemType | "";
    frequency: BudgetFrequency | "";
    custom_frequency_label: string;
    expected_amount: string;
    day_of_month: string;
    recurrence_anchor_date: string;
    start_date: string;
    end_date: string;
    is_active: boolean;
    notes: string;
    sort_order: string;
};

export type BudgetMonthlyItemFormState = {
    id: string;
    name: string;
    item_date: string;
    expected_amount: string;
    actual_amount: string;
    status: BudgetMonthlyStatus | "";
    completed_date: string;
    notes: string;
};


/* CONSTANTS */
export const budgetItemTypeOptions: { value: BudgetItemType; label: string }[] = [
    { value: "income", label: "Income" },
    { value: "bill", label: "Bill" },
    { value: "expected_expense", label: "Expected Expense" },
];

export const budgetFrequencyOptions: { value: BudgetFrequency; label: string }[] = [
    { value: "weekly", label: "Weekly" },
    { value: "bi_weekly", label: "Bi-Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "bi_monthly", label: "Bi-Monthly" },
    { value: "quarterly", label: "Quarterly" },
    { value: "semi_annual", label: "Semi-Annual" },
    { value: "annual", label: "Annual" },
    { value: "one_time", label: "One-Time" },
    { value: "custom", label: "Custom / Other" },
];

export const groupedBudgetItemTypes: BudgetItemType[] = [
    "income", "bill", "expected_expense",
];

export const emptyBudgetRecurringForm: BudgetRecurringFormState = {
    id: "",
    name: "",
    item_type: "bill",
    frequency: "monthly",
    custom_frequency_label: "",
    expected_amount: "",
    day_of_month: "",
    recurrence_anchor_date: "",
    start_date: "",
    end_date: "",
    is_active: true,
    notes: "",
    sort_order: "0",
};

export const budgetMonthlyStatusOptions: { value: BudgetMonthlyStatus; label: string }[] = [
    { value: "pending", label: "Pending" },
    { value: "completed", label: "Completed" },
    { value: "skipped", label: "Skipped" },
];