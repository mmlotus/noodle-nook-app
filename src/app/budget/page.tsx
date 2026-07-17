"use client";

import Banner from "@/components/Images/banner";
import LoadingSpinner from "@/components/LoadingSpinner";
import DragScrollContainer from "@/components/DragScrollContainer";
import { formatCurrency, isValidMoneyInput } from "@/app/utils/formatMisc";
import {
    Budget,
    BudgetMonth,
    BudgetMonthlyItem,
    BudgetMonthlyItemFormState,
    BudgetMonthlyStatus,
    budgetMonthlyStatusOptions,
} from "@/types/budget";
import {
    buildBudgetMonthlyItemForm,
    getBudgetCalendarDays,
    getBudgetCurrentMonthValue,
    getBudgetDateLabel,
    getBudgetItemsForDate,
    getBudgetMonthlyFormDifference,
    getBudgetMonthlySummary,
    getBudgetNextMonthValue,
    getBudgetPreviousMonthValue,
} from "@/lib/budget";
import global from "@/styles/Global.module.css";
import styles from "@/styles/Budget.module.css";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Pencil, Plus, SaveIcon, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getBudgetTheme } from "@/lib/budgetThemes";

export default function BudgetPage() {
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [selectedBudgetId, setSelectedBudgetId] = useState("");
    const [visibleBudgetIds, setVisibleBudgetIds] = useState<string[]>([]);
    const [calendarItemsByBudget, setCalendarItemsByBudget] = useState<Record<string, BudgetMonthlyItem[]>>({});
    const [visibleGeneratedBudgetIds, setVisibleGeneratedBudgetIds] = useState<string[]>([]);

    const [selectedMonth, setSelectedMonth] = useState(getBudgetCurrentMonthValue());
    const [budgetMonth, setBudgetMonth] = useState<BudgetMonth | null>(null);
    const [items, setItems] = useState<BudgetMonthlyItem[]>([]);

    const [startingBalance, setStartingBalance] = useState("");
    const [savingsBalance, setSavingsBalance] = useState("");
    const [editingBalanceField, setEditingBalanceField] = useState<"starting_balance" | "savings_balance" | null>(null);
    const [savingBalances, setSavingBalances] = useState(false);
    const [balanceForm, setBalanceForm] = useState({
        starting_balance: "",
        savings_balance: "",
    });

    const [oneTimeDate, setOneTimeDate] = useState("");
    const [oneTimeForm, setOneTimeForm] = useState({
        name: "",
        item_type: "expected_expense" as BudgetMonthlyItem["item_type"],
        expected_amount: "",
        notes: "",
    });
    const [savingOneTime, setSavingOneTime] = useState(false);

    const [selectedItem, setSelectedItem] = useState<BudgetMonthlyItem | null>(null);
    const [modalForm, setModalForm] = useState<BudgetMonthlyItemFormState | null>(null);

    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [savingId, setSavingId] = useState("");

    const calendarDays = useMemo(() => {
        return getBudgetCalendarDays(selectedMonth);
    }, [selectedMonth]);

    const calendarItems = useMemo(() => {
        if (visibleBudgetIds.length === 0) return [];

        return visibleBudgetIds.flatMap((budgetId) => calendarItemsByBudget[budgetId] || []);
    }, [visibleBudgetIds, calendarItemsByBudget]);

    const budgetsById = useMemo(() => {
        return new Map(budgets.map((budget) => [budget.id, budget]));
    }, [budgets]);

    const summary = useMemo(() => {
        const baseSummary = getBudgetMonthlySummary(items);
        const startingBalanceValue = Number(budgetMonth?.starting_balance || 0);
        const savingsBalanceValue =
            budgetMonth?.savings_balance === null || budgetMonth?.savings_balance === undefined
                ? null
                : Number(budgetMonth.savings_balance || 0);

        return {
            ...baseSummary,
            startingBalance: startingBalanceValue,
            savingsBalance: savingsBalanceValue,
            projectedEndingBalance:
                startingBalanceValue + baseSummary.expectedIncome - baseSummary.expectedExpenses,
            currentBalanceEstimate:
                startingBalanceValue + baseSummary.actualIncome - baseSummary.actualExpenses,
        };
    }, [items, budgetMonth]);

    useEffect(() => {
        let cancelled = false;

        async function loadBudgets() {
            try {
                const res = await fetch("/api/budget");
                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || "Failed to load budgets.");
                }

                if (cancelled) return;

                const loadedBudgets = (data.budgets || []) as Budget[];

                setBudgets(loadedBudgets);

                if (loadedBudgets.length > 0) {
                    const validBudgetIds = new Set(
                        loadedBudgets.map((budget) => budget.id)
                    );

                    const savedSelectedBudgetId =
                        window.localStorage.getItem("budget:selectedBudgetId");

                    const savedVisibleBudgetIds = JSON.parse(
                        window.localStorage.getItem("budget:visibleBudgetIds") || "[]"
                    ) as string[];

                    const nextSelectedBudgetId =
                        savedSelectedBudgetId &&
                            validBudgetIds.has(savedSelectedBudgetId)
                            ? savedSelectedBudgetId
                            : loadedBudgets[0].id;

                    const nextVisibleBudgetIds = savedVisibleBudgetIds.filter((id) =>
                        validBudgetIds.has(id)
                    );

                    setSelectedBudgetId(nextSelectedBudgetId);
                    setVisibleBudgetIds(
                        nextVisibleBudgetIds.length > 0
                            ? nextVisibleBudgetIds
                            : [nextSelectedBudgetId]
                    );
                } else {
                    setLoading(false);
                }
            } catch (err) {
                console.error("loadBudgets error:", err);

                if (!cancelled) {
                    toast.error("Could not load budgets. Please try again later.");
                    setLoading(false);
                }
            }
        }

        void loadBudgets();

        return () => {
            cancelled = true;
        };
    }, []);

    const loadBudgetMonth = useCallback(async (budgetId: string, monthValue: string, showLoading = false) => {
        if (!budgetId) return;

        if (showLoading) setLoading(true);

        try {
            const res = await fetch(`/api/budget/month?budgetId=${encodeURIComponent(budgetId)}&month=${encodeURIComponent(monthValue)}`);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to load budget month.");
            }

            if (data.month) {
                setBalanceForm({
                    starting_balance: String(data.month.starting_balance ?? "0"),
                    savings_balance:
                        data.month.savings_balance === null || data.month.savings_balance === undefined
                            ? ""
                            : String(data.month.savings_balance),
                });
            } else {
                setBalanceForm({
                    starting_balance: "",
                    savings_balance: "",
                });
            }

            setEditingBalanceField(null);
            setBudgetMonth(data.month || null);
            setItems((data.items || []) as BudgetMonthlyItem[]);
            setSelectedItem(null);
            setModalForm(null);
        } catch (err) {
            console.error("loadBudgetMonth error:", err);
            toast.error("Could not load budget month.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!selectedBudgetId) return;

        const timeoutId = window.setTimeout(() => {
            void loadBudgetMonth(selectedBudgetId, selectedMonth);
        }, 0);

        return () => window.clearTimeout(timeoutId);
    }, [loadBudgetMonth, selectedBudgetId, selectedMonth]);

    useEffect(() => {
        if (visibleBudgetIds.length === 0) return;

        let cancelled = false;

        async function loadVisibleBudgetMonths() {
            try {
                const results = await Promise.all(
                    visibleBudgetIds.map(async (budgetId) => {
                        const res = await fetch(`/api/budget/month?budgetId=${encodeURIComponent(budgetId)}&month=${encodeURIComponent(selectedMonth)}`);

                        const data = await res.json();

                        if (!res.ok) throw new Error(data.error || "Failed to load visible budget month.");

                        return {
                            budgetId,
                            monthExists: Boolean(data.month),
                            items: (data.items || []) as BudgetMonthlyItem[],
                        };
                    })
                );

                if (cancelled) return;

                const nextItemsByBudget: Record<string, BudgetMonthlyItem[]> = {};
                const nextGeneratedBudgetIds: string[] = [];

                for (const result of results) {
                    nextItemsByBudget[result.budgetId] = result.items;

                    if (result.monthExists) nextGeneratedBudgetIds.push(result.budgetId);
                }

                setCalendarItemsByBudget(nextItemsByBudget);
                setVisibleGeneratedBudgetIds(nextGeneratedBudgetIds);
            } catch (err) {
                console.error("loadVisibleBudgetMonths error:", err);

                if (!cancelled) {
                    toast.error("Could not load visible budgets.");
                }
            }
        }

        void loadVisibleBudgetMonths();

        return () => {
            cancelled = true;
        };
    }, [visibleBudgetIds, selectedMonth]);

    async function generateMonth() {
        if (!selectedBudgetId) {
            toast.error("Please select a budget.");
            return;
        }

        setGenerating(true);

        try {
            const res = await fetch("/api/budget/month", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    budgetId: selectedBudgetId,
                    month: selectedMonth,
                    starting_balance: startingBalance || 0,
                    savings_balance: savingsBalance || null,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to generate budget month.");
            }

            if (data.month) {
                setBalanceForm({
                    starting_balance: String(data.month.starting_balance ?? "0"),
                    savings_balance: data.month.savings_balance === null || data.month.savings_balance === undefined
                        ? ""
                        : String(data.month.savings_balance),
                });
            } else {
                setBalanceForm({
                    starting_balance: "",
                    savings_balance: "",
                });
            }

            setEditingBalanceField(null);
            setBudgetMonth(data.month || null);
            setItems((data.items || []) as BudgetMonthlyItem[]);
            setCalendarItemsByBudget((current) => ({
                ...current,
                [selectedBudgetId]: (data.items || []) as BudgetMonthlyItem[],
            }));
            setVisibleGeneratedBudgetIds((current) => current.includes(selectedBudgetId) ? current : [...current, selectedBudgetId]);
            setSelectedItem(null);
            setModalForm(null);
            setStartingBalance("");
            setSavingsBalance("");

            toast.success(data.alreadyGenerated ? "Budget already generated." : "Budget month generated!");
        } catch (err) {
            console.error("generateMonth error:", err);

            if (err instanceof Error) {
                toast.error(err.message);
            } else {
                toast.error("Could not generate budget month.");
            }
        } finally {
            setGenerating(false);
        }
    }

    async function saveBudgetBalances() {
        if (!budgetMonth) return;

        setSavingBalances(true);

        try {
            const res = await fetch("/api/budget/month", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    budgetId: selectedBudgetId,
                    month: selectedMonth,
                    starting_balance: balanceForm.starting_balance || 0,
                    savings_balance: balanceForm.savings_balance || null,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to save budget balances.");
            }

            setBudgetMonth(data.month);
            setBalanceForm({
                starting_balance: String(data.month.starting_balance ?? "0"),
                savings_balance: data.month.savings_balance === null || data.month.savings_balance === undefined
                    ? ""
                    : String(data.month.savings_balance),
            });

            setEditingBalanceField(null);
            toast.success("Budget balances updated.");
        } catch (err) {
            console.error("saveBudgetBalances error:", err);

            if (err instanceof Error) {
                toast.error(err.message);
            } else {
                toast.error("Could not save budget balances.");
            }
        } finally {
            setSavingBalances(false);
        }
    }

    function cancelBalanceEdit() {
        if (!budgetMonth) return;

        setBalanceForm({
            starting_balance: String(budgetMonth.starting_balance ?? "0"),
            savings_balance: budgetMonth.savings_balance === null || budgetMonth.savings_balance === undefined
                ? ""
                : String(budgetMonth.savings_balance),
        });

        setEditingBalanceField(null);
    }

    async function saveOneTimeItem() {
        if (!budgetMonth) return;

        const oneTimeName = oneTimeForm.name.trim();
        const oneTimeAmount = oneTimeForm.expected_amount.trim();
        const oneTimeNotes = oneTimeForm.notes.trim();

        if (!oneTimeName) {
            toast.error("Please enter a name.");
            return;
        }

        if (!oneTimeAmount) {
            toast.error("Please enter an expected amount.");
            return;
        }

        setSavingOneTime(true);

        try {
            const res = await fetch("/api/budget/monthly-items", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    budgetId: selectedBudgetId,
                    budget_month_id: budgetMonth.id,
                    name: oneTimeName,
                    item_type: oneTimeForm.item_type,
                    item_date: oneTimeDate,
                    expected_amount: oneTimeAmount,
                    notes: oneTimeNotes || null,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to add one-time item.");
            }

            const savedItem = data.item as BudgetMonthlyItem;

            setItems((current) => [...current, savedItem]);
            setCalendarItemsByBudget((current) => ({
                ...current,
                [selectedBudgetId]: [
                    ...(current[selectedBudgetId] || []),
                    savedItem,
                ],
            }));

            closeOneTimeModal();

            toast.success("One-time item added.");
        } catch (err) {
            console.error("saveOneTimeItem error:", err);

            if (err instanceof Error) {
                toast.error(err.message);
            } else {
                toast.error("Could not add one-time item.");
            }
        } finally {
            setSavingOneTime(false);
        }
    }

    function openOneTimeModal(date: string) {
        setOneTimeDate(date);
        setOneTimeForm({
            name: "",
            item_type: "expected_expense",
            expected_amount: "",
            notes: "",
        });
    }

    function closeOneTimeModal() {
        if (savingOneTime) return;

        setOneTimeDate("");
        setOneTimeForm({
            name: "",
            item_type: "expected_expense",
            expected_amount: "",
            notes: "",
        });
    }

    function openItemModal(item: BudgetMonthlyItem) {
        setSelectedItem(item);
        setModalForm(buildBudgetMonthlyItemForm(item));
    }

    function closeItemModal() {
        if (savingId) return;

        setSelectedItem(null);
        setModalForm(null);
    }

    function updateModalForm<K extends keyof BudgetMonthlyItemFormState>(
        key: K,
        value: BudgetMonthlyItemFormState[K]
    ) {
        setModalForm((current) => {
            if (!current) return current;

            return {
                ...current,
                [key]: value,
            };
        });
    }

    function applyStatusToModalForm(status: BudgetMonthlyStatus) {
        setModalForm((current) => {
            if (!current) return current;

            let nextActualAmount = current.actual_amount;
            let nextCompletedDate = current.completed_date;

            if (status === "completed") {
                nextActualAmount = current.actual_amount || current.expected_amount;
                nextCompletedDate = current.completed_date || current.item_date;
            }

            if (status === "skipped") {
                nextActualAmount = "0";
                nextCompletedDate = current.completed_date || current.item_date;
            }

            if (status === "pending") {
                nextActualAmount = "";
                nextCompletedDate = "";
            }

            return {
                ...current,
                status,
                actual_amount: nextActualAmount,
                completed_date: nextCompletedDate,
            };
        });
    }

    async function saveSelectedMonthlyItem() {
        if (!selectedItem || !modalForm) return;

        if (!modalForm.status) {
            toast.error("Please choose a status.");
            return;
        }

        setSavingId(selectedItem.id);

        try {
            const res = await fetch("/api/budget/monthly-items", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    budgetId: selectedBudgetId,
                    id: modalForm.id,
                    name: modalForm.name,
                    item_date: modalForm.item_date || null,
                    expected_amount: modalForm.expected_amount,
                    actual_amount: modalForm.actual_amount || null,
                    status: modalForm.status,
                    completed_date: modalForm.completed_date || null,
                    notes: modalForm.notes || null,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to save monthly budget item.");
            }

            const savedItem = data.item as BudgetMonthlyItem;

            setItems((current) =>
                current.map((item) => item.id === savedItem.id ? savedItem : item)
            );
            setCalendarItemsByBudget((current) => ({
                ...current,
                [selectedBudgetId]: (current[selectedBudgetId] || []).map((item) =>
                    item.id === savedItem.id ? savedItem : item
                ),
            }));

            setSelectedItem(null);
            setModalForm(null);

            toast.success("Budget item updated.");
        } catch (err) {
            console.error("saveSelectedMonthlyItem error:", err);

            if (err instanceof Error) {
                toast.error(err.message);
            } else {
                toast.error("Could not save budget item.");
            }
        } finally {
            setSavingId("");
        }
    }

    const selectedMonthLabel = useMemo(() => {
        const date = new Date(`${selectedMonth}-01T00:00:00`);

        if (Number.isNaN(date.getTime())) {
            return "Budget Calendar";
        }

        return date.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
        });
    }, [selectedMonth]);

    if (loading) return <LoadingSpinner />;

    return (
        <main className={global.pageWrapper}>
            <Banner
                type="default"
                title="Budget"
                subtitle="Track monthly income, bills, expected expenses, and actuals."
            />

            <div className={styles.budgetPage}>
                <section className={styles.section}>
                    <div className={styles.sectionHeaderRow}>
                        <div>
                            <h2 className={global.headLeft}>Monthly Budget</h2>
                            <p>
                                View your month by date, then click an item to update actuals, status, and notes.
                            </p>
                        </div>

                        <div className={styles.recurringHeaderActions}>
                            <div className={styles.estimateMonthField}>
                                <label className={global.label}>Budget</label>

                                <select
                                    className={global.input}
                                    value={selectedBudgetId}
                                    onChange={(event) => {
                                        const nextBudgetId = event.target.value;
                                        window.localStorage.setItem(
                                            "budget:selectedBudgetId",
                                            nextBudgetId
                                        );
                                        setSelectedBudgetId(nextBudgetId);
                                        setVisibleBudgetIds((current) => {
                                            const next = current.includes(nextBudgetId)
                                                ? current
                                                : [...current, nextBudgetId];

                                            window.localStorage.setItem(
                                                "budget:visibleBudgetIds",
                                                JSON.stringify(next)
                                            );

                                            return next;
                                        });
                                        setBudgetMonth(null);
                                        setItems([]);
                                        setSelectedItem(null);
                                        setModalForm(null);
                                        setEditingBalanceField(null);
                                        setStartingBalance("");
                                        setSavingsBalance("");
                                        setBalanceForm({
                                            starting_balance: "",
                                            savings_balance: "",
                                        });
                                    }}
                                >
                                    {budgets.map((budget) => (
                                        <option key={budget.id} value={budget.id}>
                                            {budget.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className={styles.estimateMonthField}>
                                <label className={global.label}>Budget Month</label>
                                <input
                                    type="month"
                                    className={global.input}
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                />
                            </div>

                            <Link href="/budget/recurring" className={global.linkBtn}>
                                Manage Recurring Items
                            </Link>
                        </div>
                    </div>

                    <div className={styles.budgetVisibilityList}>
                        <label className={global.label}>Visible Budgets</label>

                        <div className={styles.budgetVisibilityOptions}>
                            {budgets.map((budget) => {
                                const isVisible = visibleBudgetIds.includes(budget.id);

                                return (
                                    <label key={budget.id} className={styles.checkboxRow}>
                                        <input
                                            type="checkbox"
                                            checked={isVisible}
                                            onChange={() => {
                                                setVisibleBudgetIds((current) => {
                                                    const next = current.includes(budget.id)
                                                        ? current.filter((id) => id !== budget.id)
                                                        : [...current, budget.id];

                                                    window.localStorage.setItem(
                                                        "budget:visibleBudgetIds",
                                                        JSON.stringify(next)
                                                    );

                                                    return next;
                                                });
                                            }}
                                        />

                                        <span
                                            className={styles.budgetThemeMarker}
                                            style={{
                                                background: getBudgetTheme(budget.theme_key).completed,
                                            }}
                                        />

                                        <span>{budget.name}</span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    {!budgetMonth ? (
                        <div className={styles.generateMonthBox}>
                            <p>No budget has been generated for this month yet.</p>

                            <div className={styles.generateMonthGrid}>
                                <div className={styles.field}>
                                    <label className={global.label}>Starting Balance</label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        className={global.input}
                                        value={startingBalance}
                                        onChange={(e) => {
                                            const nextValue = e.target.value;

                                            if (isValidMoneyInput(nextValue)) {
                                                setStartingBalance(nextValue);
                                            }
                                        }}
                                        placeholder="0.00"
                                    />
                                </div>

                                <div className={styles.field}>
                                    <label className={global.label}>Savings Balance Optional</label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        className={global.input}
                                        value={savingsBalance}
                                        onChange={(e) => {
                                            const nextValue = e.target.value;

                                            if (isValidMoneyInput(nextValue)) {
                                                setSavingsBalance(nextValue);
                                            }
                                        }}
                                        placeholder="Optional"
                                    />
                                </div>
                            </div>

                            <button
                                type="button"
                                className={global.buttonBrand}
                                onClick={generateMonth}
                                disabled={generating}
                            >
                                {generating ? "Generating..." : "Generate Month"}
                            </button>
                        </div>
                    ) : (
                        <div className={styles.summaryGrid}>
                            <div className={styles.summaryCard}>
                                {editingBalanceField !== "starting_balance" && (
                                    <button
                                        type="button"
                                        className={`${global.iconButton} ${styles.summaryCardIcon}`}
                                        onClick={() => setEditingBalanceField("starting_balance")}
                                        aria-label="Edit starting balance"
                                    >
                                        <Pencil size={16} />
                                    </button>
                                )}

                                <span className={styles.groupTotalLabel}>Starting Balance</span>

                                {editingBalanceField === "starting_balance" ? (
                                    <div className={styles.inlineSaveRow}>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            className={global.input}
                                            value={balanceForm.starting_balance}
                                            onChange={(e) => {
                                                const nextValue = e.target.value;

                                                if (isValidMoneyInput(nextValue)) {
                                                    setBalanceForm((current) => ({
                                                        ...current,
                                                        starting_balance: nextValue,
                                                    }));
                                                }
                                            }}
                                            placeholder="0.00"
                                        />

                                        <button
                                            type="button"
                                            className={global.iconButton}
                                            onClick={saveBudgetBalances}
                                            disabled={savingBalances}
                                            aria-label="Save starting balance"
                                            title="Save starting balance"
                                        >
                                            <SaveIcon size={16} />
                                        </button>

                                        <button
                                            type="button"
                                            className={global.iconButton}
                                            onClick={cancelBalanceEdit}
                                            disabled={savingBalances}
                                            aria-label="Cancel starting balance edit"
                                            title="Cancel"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <strong>{formatCurrency(summary.startingBalance)}</strong>
                                )}
                            </div>

                            <div className={styles.summaryCard}>
                                {editingBalanceField !== "savings_balance" && (
                                    <button
                                        type="button"
                                        className={`${global.iconButton} ${styles.summaryCardIcon}`}
                                        onClick={() => setEditingBalanceField("savings_balance")}
                                        aria-label="Edit savings balance"
                                    >
                                        <Pencil size={16} />
                                    </button>
                                )}

                                <span className={styles.groupTotalLabel}>Savings Starting Balance</span>

                                {editingBalanceField === "savings_balance" ? (
                                    <div className={styles.inlineSaveRow}>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            className={global.input}
                                            value={balanceForm.savings_balance}
                                            onChange={(e) => {
                                                const nextValue = e.target.value;

                                                if (isValidMoneyInput(nextValue)) {
                                                    setBalanceForm((current) => ({
                                                        ...current,
                                                        savings_balance: nextValue,
                                                    }));
                                                }
                                            }}
                                            placeholder="Optional"
                                        />

                                        <button
                                            type="button"
                                            className={global.iconButton}
                                            onClick={saveBudgetBalances}
                                            disabled={savingBalances}
                                            aria-label="Save savings balance"
                                            title="Save savings balance"
                                        >
                                            <SaveIcon size={16} />
                                        </button>

                                        <button
                                            type="button"
                                            className={global.iconButton}
                                            onClick={cancelBalanceEdit}
                                            disabled={savingBalances}
                                            aria-label="Cancel savings balance edit"
                                            title="Cancel"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <strong>
                                        {summary.savingsBalance === null
                                            ? "—"
                                            : formatCurrency(summary.savingsBalance)}
                                    </strong>
                                )}
                            </div>

                            <div className={styles.summaryCard}>
                                <span className={styles.groupTotalLabel}>Expected Income</span>
                                <strong>{formatCurrency(summary.expectedIncome)}</strong>
                            </div>

                            <div className={styles.summaryCard}>
                                <span className={styles.groupTotalLabel}>Actual Income</span>
                                <strong>{formatCurrency(summary.actualIncome)}</strong>
                            </div>

                            <div className={styles.summaryCard}>
                                <span className={styles.groupTotalLabel}>Expected Expenses</span>
                                <strong>{formatCurrency(summary.expectedExpenses)}</strong>
                            </div>

                            <div className={styles.summaryCard}>
                                <span className={styles.groupTotalLabel}>Actual Expenses</span>
                                <strong>{formatCurrency(summary.actualExpenses)}</strong>
                            </div>

                            <div className={styles.summaryCard}>
                                <span className={styles.groupTotalLabel}>Projected Ending Balance</span>
                                <strong>{formatCurrency(summary.projectedEndingBalance)}</strong>
                            </div>

                            <div className={styles.summaryCard}>
                                <span className={styles.groupTotalLabel}>Current Balance Estimate</span>
                                <strong>{formatCurrency(summary.currentBalanceEstimate)}</strong>
                            </div>
                        </div>
                    )}
                </section>

                {visibleBudgetIds.some((budgetId) => visibleGeneratedBudgetIds.includes(budgetId)) && (
                    <section className={styles.section}>
                        <div className={styles.calendarHeader}>
                            <button
                                type="button"
                                className={global.iconButton}
                                onClick={() => setSelectedMonth(getBudgetPreviousMonthValue(selectedMonth))}
                                aria-label="Previous month"
                            >
                                <ChevronLeft size={20} />
                            </button>

                            <h2 className={global.headLeft}>{selectedMonthLabel}</h2>

                            <button
                                type="button"
                                className={global.iconButton}
                                onClick={() => setSelectedMonth(getBudgetNextMonthValue(selectedMonth))}
                                aria-label="Next month"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>

                        <DragScrollContainer className={styles.calendarShell}>
                            <div className={styles.calendarWeekdays}>
                                <span>Sun</span>
                                <span>Mon</span>
                                <span>Tue</span>
                                <span>Wed</span>
                                <span>Thu</span>
                                <span>Fri</span>
                                <span>Sat</span>
                            </div>

                            <div className={styles.calendarGrid}>
                                {calendarDays.map((day) => {
                                    const dayItems = getBudgetItemsForDate(calendarItems, day.date);

                                    return (
                                        <div
                                            key={day.date}
                                            className={
                                                day.isCurrentMonth
                                                    ? styles.calendarDay
                                                    : `${styles.calendarDay} ${styles.calendarDayMuted}`
                                            }
                                        >
                                            <div className={styles.calendarDayTop}>
                                                <div className={styles.calendarDayNumber}>
                                                    {day.dayNumber}
                                                </div>

                                                {day.isCurrentMonth && (
                                                    <button
                                                        type="button"
                                                        className={`${global.iconButton} ${styles.calendarAddButton}`}
                                                        onClick={() => openOneTimeModal(day.date)}
                                                        aria-label={`Add one-time item for ${day.date}`}
                                                        title="Add One-Time Item"
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                )}
                                            </div>

                                            <div className={styles.calendarEvents}>
                                                {dayItems.map((item) => {
                                                    const itemBudget = budgetsById.get(item.budget_id);
                                                    const itemTheme = getBudgetTheme(itemBudget?.theme_key);

                                                    const background =
                                                        item.status === "completed"
                                                            ? itemTheme.completed
                                                            : item.status === "skipped"
                                                                ? itemTheme.skipped
                                                                : itemTheme.pending;

                                                    const textColor =
                                                        item.status === "completed"
                                                            ? itemTheme.completedText
                                                            : item.status === "skipped"
                                                                ? itemTheme.skippedText
                                                                : itemTheme.pendingText;

                                                    return (
                                                        <button
                                                            key={item.id}
                                                            type="button"
                                                            className={
                                                                item.status === "completed"
                                                                    ? styles.calendarEventCompleted
                                                                    : item.status === "skipped"
                                                                        ? styles.calendarEventSkipped
                                                                        : styles.calendarEventPending
                                                            }
                                                            style={{
                                                                background,
                                                                borderColor: background,
                                                                color: textColor,
                                                            }}
                                                            onClick={() => {
                                                                if (item.budget_id !== selectedBudgetId) return;

                                                                openItemModal(item);
                                                            }}
                                                            disabled={item.budget_id !== selectedBudgetId}
                                                            title={
                                                                item.budget_id === selectedBudgetId
                                                                    ? `Edit ${item.name} — ${itemBudget?.name || "Budget"}`
                                                                    : `${itemBudget?.name || "Budget"} — select this budget above to edit`
                                                            }
                                                        >
                                                            <span>{item.name}</span>
                                                            <strong>{formatCurrency(item.expected_amount)}</strong>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </DragScrollContainer>
                    </section>
                )}
            </div>

            {selectedItem && modalForm && (
                <div
                    className={styles.budgetModalOverlay}
                    onClick={closeItemModal}
                    role="presentation"
                >
                    <div
                        className={styles.budgetModal}
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="budget-item-modal-title"
                    >
                        <div className={styles.budgetModalHeader}>
                            <div>
                                <h2 id="budget-item-modal-title">{selectedItem.name}</h2>
                                <p>
                                    {selectedItem.is_one_time ? "One-time item" : "Recurring item"}
                                </p>
                            </div>

                            <button
                                type="button"
                                className={global.iconButton}
                                onClick={closeItemModal}
                                disabled={Boolean(savingId)}
                                aria-label="Close budget item modal"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className={styles.budgetModalBody}>
                            <div className={styles.modalFormGrid}>
                                <div className={styles.field}>
                                    <span className={global.label}>Name</span>
                                    <div className={styles.readOnlyValue}>
                                        {modalForm.name}
                                    </div>
                                </div>

                                <div className={styles.field}>
                                    <label className={global.label}>
                                        {getBudgetDateLabel(selectedItem.item_type)}
                                    </label>
                                    <input
                                        type="date"
                                        className={global.input}
                                        value={modalForm.item_date}
                                        onChange={(e) => updateModalForm("item_date", e.target.value)}
                                    />
                                </div>

                                <div className={styles.field}>
                                    <span className={global.label}>Expected</span>
                                    <div className={styles.readOnlyValue}>
                                        {formatCurrency(modalForm.expected_amount)}
                                    </div>
                                </div>

                                <div className={styles.field}>
                                    <label className={global.label}>Actual</label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        className={global.input}
                                        value={modalForm.actual_amount}
                                        onChange={(e) => {
                                            const nextValue = e.target.value;

                                            if (/^\d*\.?\d{0,2}$/.test(nextValue)) {
                                                updateModalForm("actual_amount", nextValue);
                                            }
                                        }}
                                    />
                                </div>

                                <div className={`${styles.field} ${styles.statusField}`}>
                                    <label className={global.label}>Status</label>

                                    <div className={styles.statusButtonGroup}>
                                        {budgetMonthlyStatusOptions.map((option) => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                className={
                                                    modalForm.status === option.value
                                                        ? `${styles.statusButton} ${styles.statusButtonActive}`
                                                        : styles.statusButton
                                                }
                                                onClick={() => applyStatusToModalForm(option.value)}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className={styles.field}>
                                    <label className={global.label}>Completed Date</label>
                                    <input
                                        type="date"
                                        className={global.input}
                                        value={modalForm.completed_date}
                                        onChange={(e) => updateModalForm("completed_date", e.target.value)}
                                        disabled={modalForm.status === "pending"}
                                    />
                                </div>

                                <div className={`${styles.field} ${styles.fullWidth}`}>
                                    <label className={global.label}>Notes</label>
                                    <textarea
                                        className={global.textarea}
                                        value={modalForm.notes}
                                        onChange={(e) => updateModalForm("notes", e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className={styles.budgetModalFooter}>
                            <span className={styles.detailValue}>
                                Difference: {formatCurrency(
                                    getBudgetMonthlyFormDifference({
                                        itemType: selectedItem.item_type,
                                        form: modalForm,
                                    })
                                )}
                            </span>

                            <div className={styles.budgetModalActions}>
                                <button
                                    type="button"
                                    className={global.buttonSecondary}
                                    onClick={closeItemModal}
                                    disabled={Boolean(savingId)}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="button"
                                    className={global.buttonBrand}
                                    onClick={saveSelectedMonthlyItem}
                                    disabled={Boolean(savingId)}
                                >
                                    {savingId ? "Saving..." : "Save"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {oneTimeDate && (
                <div
                    className={styles.budgetModalOverlay}
                    onClick={closeOneTimeModal}
                    role="presentation"
                >
                    <div
                        className={styles.budgetModal}
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="one-time-modal-title"
                    >
                        <div className={styles.budgetModalHeader}>
                            <div>
                                <h2 id="one-time-modal-title">Add One-Time Item</h2>
                                <p>{oneTimeDate}</p>
                            </div>

                            <button
                                type="button"
                                className={global.iconButton}
                                onClick={closeOneTimeModal}
                                disabled={savingOneTime}
                                aria-label="Close one-time item modal"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className={styles.budgetModalBody}>
                            <div className={styles.modalFormGrid}>
                                <div className={styles.field}>
                                    <label className={global.label}>Name</label>
                                    <input
                                        className={global.input}
                                        value={oneTimeForm.name}
                                        onChange={(e) =>
                                            setOneTimeForm((current) => ({
                                                ...current,
                                                name: e.target.value,
                                            }))
                                        }
                                        placeholder="Groceries, vet bill, birthday gift..."
                                    />
                                </div>

                                <div className={styles.field}>
                                    <label className={global.label}>Type</label>
                                    <select
                                        className={global.input}
                                        value={oneTimeForm.item_type}
                                        onChange={(e) =>
                                            setOneTimeForm((current) => ({
                                                ...current,
                                                item_type: e.target.value as BudgetMonthlyItem["item_type"],
                                            }))
                                        }
                                    >
                                        <option value="income">Income</option>
                                        <option value="bill">Bill</option>
                                        <option value="expected_expense">Expected Expense</option>
                                    </select>
                                </div>

                                <div className={styles.field}>
                                    <label className={global.label}>Expected Amount</label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        className={global.input}
                                        value={oneTimeForm.expected_amount}
                                        onChange={(e) => {
                                            const nextValue = e.target.value;

                                            if (isValidMoneyInput(nextValue)) {
                                                setOneTimeForm((current) => ({
                                                    ...current,
                                                    expected_amount: nextValue,
                                                }));
                                            }
                                        }}
                                        placeholder="0.00"
                                    />
                                </div>

                                <div className={`${styles.field} ${styles.fullWidth}`}>
                                    <label className={global.label}>Notes</label>
                                    <textarea
                                        className={global.textarea}
                                        value={oneTimeForm.notes}
                                        onChange={(e) =>
                                            setOneTimeForm((current) => ({
                                                ...current,
                                                notes: e.target.value,
                                            }))
                                        }
                                        placeholder="Optional"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className={styles.budgetModalFooter}>
                            <span className={styles.detailValue}>
                                One-time items only. Recurring items belong on the recurring setup page.
                            </span>

                            <div className={styles.budgetModalActions}>
                                <button
                                    type="button"
                                    className={global.buttonSecondary}
                                    onClick={closeOneTimeModal}
                                    disabled={savingOneTime}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="button"
                                    className={global.buttonBrand}
                                    onClick={saveOneTimeItem}
                                    disabled={savingOneTime}
                                >
                                    {savingOneTime ? "Saving..." : "Add Item"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}