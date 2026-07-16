"use client";

import global from "@/styles/Global.module.css";
import styles from "@/styles/Budget.module.css";
import toast from "react-hot-toast";
import { useEffect, useMemo, useState } from "react";
import { Budget, BudgetFrequency, budgetFrequencyOptions, BudgetItemType, budgetItemTypeOptions, BudgetRecurringFormState, BudgetRecurringItem, BudgetThemeKey, emptyBudgetRecurringForm, groupedBudgetItemTypes } from "@/types/budget";
import { budgetRecurringFormToPayload, budgetRecurringItemToForm, getBudgetDateLabel, getBudgetDayDisplay, getBudgetFrequencyLabel, getBudgetItemTypeLabel, getBudgetOccurrenceDatesForMonth, normalizeBudgetDate } from "@/lib/budget";
import LoadingSpinner from "@/components/LoadingSpinner";
import Banner from "@/components/Images/banner";
import TagSelector from "@/components/TagSelector";
import { formatCurrency } from "@/app/utils/formatMisc";
import { Pencil, Trash } from "lucide-react";
import BasicModal from "@/components/Modals/PopupModal";
import Pagination from "@/components/Pagination";
import { budgetThemeOptions, getBudgetTheme } from "@/lib/budgetThemes";

export default function BudgetRecurringPage() {
    const [items, setItems] = useState<BudgetRecurringItem[]>([]);
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [selectedBudgetId, setSelectedBudgetId] = useState("");
    const [newBudgetName, setNewBudgetName] = useState("");
    const [newBudgetThemeKey, setNewBudgetThemeKey] = useState<BudgetThemeKey>("berries");
    const [creatingBudget, setCreatingBudget] = useState(false);
    const [savingBudgetTheme, setSavingBudgetTheme] = useState(false);
    const [showCreateBudgetModal, setShowCreateBudgetModal] = useState(false);
    const [form, setForm] = useState<BudgetRecurringFormState>(emptyBudgetRecurringForm);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [recurringPages, setRecurringPages] = useState<Record<BudgetItemType, number>>({
        income: 1,
        bill: 1,
        expected_expense: 1,
    });
    const [recurringPerPage, setRecurringPerPage] = useState(5);

    const [pendingDeactivateItem, setPendingDeactivateItem] = useState<BudgetRecurringItem | null>(null);
    const [deactivatingId, setDeactivatingId] = useState("");
    const [showInactiveItems, setShowInactiveItems] = useState(false);

    const isEditing = Boolean(form.id);

    const selectedNewBudgetTheme = getBudgetTheme(newBudgetThemeKey);
    const selectedBudget = budgets.find((budget) => budget.id === selectedBudgetId);
    const selectedBudgetTheme = getBudgetTheme(selectedBudget?.theme_key);

    const currentBudgetMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`;

    const groupedItems = useMemo(() => {
        const visibleItems = showInactiveItems ? items : items.filter((item) => item.is_active);

        return groupedBudgetItemTypes.map((itemType) => {
            const groupItems = visibleItems.filter((item) => item.item_type === itemType);
            const currentPage = recurringPages[itemType] || 1;
            const startIndex = (currentPage - 1) * recurringPerPage;

            const expectedTotal = groupItems.reduce((total, item) => {
                const occurrenceCount = getBudgetOccurrenceDatesForMonth({
                    item,
                    budgetMonth: currentBudgetMonth,
                }).length;

                return total + Number(item.expected_amount || 0) * occurrenceCount;
            }, 0);

            return {
                itemType,
                label: getBudgetItemTypeLabel(itemType),
                totalItems: groupItems.length,
                expectedTotal,
                currentPage,
                items: groupItems.slice(startIndex, startIndex + recurringPerPage),
            };
        });
    }, [items, showInactiveItems, recurringPages, recurringPerPage, currentBudgetMonth]);

    const visibleItemCount = groupedItems.reduce((total, group) => total + group.totalItems, 0);

    useEffect(() => {
        let cancelled = false;

        async function loadBudgets() {
            try {
                const res = await fetch("/api/budget");

                if (!res.ok) throw new Error("Failed to load budgets.");

                const data = await res.json();
                const loadedBudgets = (data.budgets || []) as Budget[];

                if (cancelled) return;

                setBudgets(loadedBudgets);

                if (loadedBudgets.length > 0) {
                    setSelectedBudgetId(loadedBudgets[0].id);
                } else {
                    setLoading(false);
                }
            } catch (err) {
                console.error("Load budgets error:", err);

                if (!cancelled) {
                    toast.error("Could not load budgets. Please try again later.");
                    setLoading(false);
                }
            }
        }

        loadBudgets();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!selectedBudgetId) return;

        let cancelled = false;

        async function loadItems() {
            setLoading(true);

            try {
                const res = await fetch(`/api/budget/recurring?budgetId=${encodeURIComponent(selectedBudgetId)}`);

                if (!res.ok) throw new Error("Failed to load recurring budget items.");

                const data = await res.json();

                if (!cancelled) {
                    setItems(data.items || []);
                }
            } catch (err) {
                console.error("Load recurring budget items error:", err);

                if (!cancelled) {
                    toast.error("Could not load recurring budget items. Please try again later.");
                    setItems([]);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadItems();

        return () => {
            cancelled = true;
        };
    }, [selectedBudgetId]);

    function updateForm<K extends keyof BudgetRecurringFormState>(
        key: K,
        value: BudgetRecurringFormState[K]
    ) {
        setForm((current) => ({
            ...current,
            [key]: value,
        }));
    }

    function resetForm() {
        setForm(emptyBudgetRecurringForm);
    }

    async function createBudget() {
        const name = newBudgetName.trim();

        if (!name) {
            toast.error("Please enter a budget name.");
            return;
        }

        setCreatingBudget(true);

        try {
            const res = await fetch("/api/budget", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, theme_key: newBudgetThemeKey }),
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Failed to create budget.");

            const createdBudget = data.budget as Budget;

            setBudgets((current) => [...current, createdBudget]);
            setSelectedBudgetId(createdBudget.id);
            setItems([]);
            setNewBudgetName("");
            setNewBudgetThemeKey("berries");
            setShowCreateBudgetModal(false);
            resetForm();

            toast.success(`${createdBudget.name} budget created!`);
        } catch (err) {
            console.error("createBudget error:", err);
            toast.error(err instanceof Error ? err.message : "Could not create budget.");
        } finally {
            setCreatingBudget(false);
        }
    }

    async function updateBudgetTheme(themeKey: BudgetThemeKey) {
        if (!selectedBudgetId) return;

        setSavingBudgetTheme(true);

        try {
            const res = await fetch("/api/budget", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: selectedBudgetId,
                    theme_key: themeKey,
                }),
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Failed to update budget theme.");

            const updatedBudget = data.budget as Budget;

            setBudgets((current) => current.map((budget) => budget.id === updatedBudget.id ? updatedBudget : budget));

            toast.success("Budget theme updated!");
        } catch (err) {
            console.error("udpateBudgetTheme error:", err);
            toast.error(err instanceof Error ? err.message : "Could not update budget theme.");
        } finally {
            setSavingBudgetTheme(false);
        }
    }

    function editItem(item: BudgetRecurringItem) {
        setForm(budgetRecurringItemToForm(item));
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    async function saveItem() {
        setSaving(true);

        if (!form.name.trim()) {
            toast.error("Please enter a name.");
            setSaving(false);
            return;
        }

        if (!form.item_type) {
            toast.error("Please choose a type.");
            setSaving(false);
            return;
        }

        if (!form.frequency) {
            toast.error("Please choose a frequency.");
            setSaving(false);
            return;
        }

        if (!form.expected_amount.trim()) {
            toast.error("Please enter an expected amount.");
            setSaving(false);
            return;
        }

        const expectedAmount = Number(form.expected_amount);

        if (!Number.isFinite(expectedAmount) || expectedAmount < 0) {
            toast.error("Expected amount must be a valid number.");
            setSaving(false);
            return;
        }

        if (form.day_of_month) {
            const day = Number(form.day_of_month);

            if (!Number.isInteger(day) || day < 1 || day > 31) {
                toast.error("Pay/Due day must be between 1 and 31.");
                setSaving(false);
                return;
            }
        }

        if (form.start_date && form.end_date && form.end_date < form.start_date) {
            toast.error("End date cannot be before start date.");
            setSaving(false);
            return;
        }

        try {
            if (!selectedBudgetId) {
                toast.error("Please select a budget.");
                setSaving(false);
                return;
            }

            const payload = {
                ...budgetRecurringFormToPayload(form),
                budgetId: selectedBudgetId,
            };

            console.log("budget recurring form:", form);
            console.log("budget recurring payload:", payload);

            const res = await fetch("/api/budget/recurring", {
                method: isEditing ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Failed to save recurring budget item.");

            const savedItem = data.item as BudgetRecurringItem;

            setItems((current) => {
                if (isEditing) {
                    return current.map((item) => item.id === savedItem.id ? savedItem : item);
                }

                return [savedItem, ...current];
            });

            resetForm();
            toast.success(isEditing ? "Recurring item udpated!" : "Recurring item added!");
        } catch (err) {
            console.error("saveItem error:", err);
            toast.error("Could not save recurring budget item.");
        } finally {
            setSaving(false);
        }
    }

    function openDeactivateModal(item: BudgetRecurringItem) {
        setPendingDeactivateItem(item);
    }

    function closeDeavtivateModal() {
        if (deactivatingId) return;
        setPendingDeactivateItem(null);
    }

    async function deactivateItem(item: BudgetRecurringItem) {
        if (!selectedBudgetId) {
            toast.error("Please select a budget.");
            return;
        }

        setDeactivatingId(item.id);

        try {
            const res = await fetch("/api/budget/recurring", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: item.id,
                    budgetId: selectedBudgetId,
                }),
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Failed to deactivate recurring budget item.");

            const updatedItem = data.item as BudgetRecurringItem;

            setItems((current) => current.map((currentItem) => currentItem.id === updatedItem.id ? updatedItem : currentItem));

            if (form.id === updatedItem.id) {
                resetForm();
            }

            setPendingDeactivateItem(null);
            toast.success("Recurring item deactivated!");
        } catch (err) {
            console.error("deactivateItem error:", err);
            toast.error("Could not deactivate recurring budget item.");
        } finally {
            setDeactivatingId("");
        }
    }

    if (loading) return <LoadingSpinner />;

    if (budgets.length === 0) {
        return (
            <main className={global.pageWrapper}>
                <Banner
                    type="default"
                    title="Budget Setup"
                    subtitle="Manager your recurring income, bills, & expected expenses."
                />

                <div className={styles.budgetPage}>
                    <section className={styles.section}>
                        <p className={styles.emptyState}>
                            No budgets are available.
                        </p>
                    </section>
                </div>
            </main>
        );
    }

    return (
        <main className={global.pageWrapper}>
            <Banner
                type="default"
                title="Budget Setup"
                subtitle="Manage your recurring income, bills, & expected expenses."
            />

            <div className={styles.budgetPage}>
                <section className={styles.section}>
                    <div className={styles.sectionHeaderRow}>
                        <div className={styles.field}>
                            <label className={global.label}>Budget</label>
                        </div>

                        <button
                            type="button"
                            className={global.iconButton}
                            onClick={() => setShowCreateBudgetModal(true)}
                            aria-label="Create Budget"
                            title="Create Budget"
                        >
                            +
                        </button>
                    </div>

                    <div className={styles.field}>
                        <select
                            className={global.input}
                            value={selectedBudgetId}
                            onChange={(event) => {
                                setSelectedBudgetId(event.target.value);
                                setItems([]);
                                resetForm();
                                setPendingDeactivateItem(null);
                                setShowInactiveItems(false);
                                setRecurringPages({
                                    income: 1,
                                    bill: 1,
                                    expected_expense: 1,
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

                    <div className={styles.field}>
                        <label className={global.label}>Budget Theme</label>

                        <select
                            className={global.input}
                            value={selectedBudget?.theme_key || "berries"}
                            onChange={(event) => void updateBudgetTheme(event.target.value as BudgetThemeKey)}
                            disabled={savingBudgetTheme}
                        >
                            {budgetThemeOptions.map((theme) => (
                                <option key={theme.key} value={theme.key}>
                                    {theme.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.budgetThemePreview}>
                        <span
                            style={{
                                background: selectedBudgetTheme.pending,
                                color: selectedBudgetTheme.pendingText,
                            }}
                        >
                            Pending
                        </span>

                        <span
                            style={{
                                background: selectedBudgetTheme.completed,
                                color: selectedBudgetTheme.completedText,
                            }}
                        >
                            Completed
                        </span>

                        <span
                            style={{
                                background: selectedBudgetTheme.skipped,
                                color: selectedBudgetTheme.skippedText,
                            }}
                        >
                            Skipped
                        </span>
                    </div>
                </section>

                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={global.headLeft}>
                            {isEditing ? "Edit Recurring Item" : "Add Recurring Item"}
                        </h2>

                        <p>
                            These are the saved items that will be used to build each monthly budget.
                        </p>
                    </div>

                    <div className={styles.formGrid}>
                        <div className={styles.field}>
                            <label className={global.label}>Name</label>
                            <input
                                type="text"
                                className={global.input}
                                value={form.name}
                                onChange={(e) => updateForm("name", e.target.value)}
                                placeholder="Spotify, Mortgage, Paycheck..."
                            />
                        </div>

                        <div className={styles.field}>
                            <label className={global.label}>Type</label>
                            <TagSelector
                                mode="single"
                                options={budgetItemTypeOptions.map((option) => option.value)}
                                selected={form.item_type ? [form.item_type] : []}
                                onChange={(selected) =>
                                    setForm((current) => ({
                                        ...current,
                                        item_type: (selected[0] || "") as BudgetItemType | "",
                                    }))
                                }
                                labelForValue={(value) =>
                                    budgetItemTypeOptions.find((option) => option.value === value)?.label || value
                                }
                                placeholder="Choose type"
                                allowCreate={false}
                            />
                        </div>

                        <div className={styles.field}>
                            <label className={global.label}>Frequency</label>
                            <TagSelector
                                mode="single"
                                options={budgetFrequencyOptions.map((option) => option.value)}
                                selected={form.frequency ? [form.frequency] : []}
                                onChange={(selected) =>
                                    setForm((current) => ({
                                        ...current,
                                        frequency: (selected[0] || "") as BudgetFrequency | "",
                                    }))
                                }
                                labelForValue={(value) =>
                                    budgetFrequencyOptions.find((option) => option.value === value)?.label || value
                                }
                                placeholder="Choose frequency"
                                allowCreate={false}
                            />
                        </div>

                        <div className={styles.field}>
                            <label className={global.label}>Custom Frequency Label</label>
                            <input
                                type="text"
                                className={global.input}
                                value={form.custom_frequency_label}
                                onChange={(e) => updateForm("custom_frequency_label", e.target.value)}
                                placeholder="year - 3/1, qty or yr..."
                            />
                        </div>

                        <div className={styles.field}>
                            <label className={global.label}>Expected Amount</label>
                            <input
                                type="number"
                                className={global.input}
                                min={0}
                                step={0.01}
                                value={form.expected_amount}
                                onChange={(e) => updateForm("expected_amount", e.target.value)}
                                placeholder="0.00"
                            />
                        </div>

                        <div className={styles.field}>
                            <label className={global.label}>
                                {form.item_type === "income" ? "Pay Date" : "Due Date"} (optional)
                            </label>
                            <input
                                type="number"
                                className={global.input}
                                min={1}
                                max={31}
                                step={1}
                                value={form.day_of_month}
                                onChange={(e) => updateForm("day_of_month", e.target.value)}
                                placeholder="1-31"
                            />
                        </div>

                        <div className={styles.field}>
                            <label className={global.label}>Start Date</label>
                            <input
                                type="date"
                                className={global.input}
                                value={form.start_date}
                                onChange={(e) => updateForm("start_date", e.target.value)}
                            />
                        </div>

                        <div className={styles.field}>
                            <label className={global.label}>End Date</label>
                            <input
                                type="date"
                                className={global.input}
                                value={form.end_date}
                                onChange={(e) => updateForm("end_date", e.target.value)}
                            />
                        </div>

                        <div className={styles.checkboxRow}>
                            <input
                                id="budget-recurring-active"
                                type="checkbox"
                                checked={form.is_active}
                                onChange={(e) => updateForm("is_active", e.target.checked)}
                            />

                            <label className={global.label}>Active</label>
                        </div>

                        <div className={`${styles.field} ${styles.fullWidth}`}>
                            <label className={global.label}>Notes</label>
                            <textarea
                                className={global.textarea}
                                value={form.notes}
                                onChange={(e) => updateForm("notes", e.target.value)}
                                placeholder="(optional)"
                            />
                        </div>
                    </div>

                    <div className={styles.actions}>
                        {isEditing && (
                            <button
                                type="button"
                                className={global.buttonSecondary}
                                onClick={resetForm}
                                disabled={saving}
                            >
                                Cancel Edit
                            </button>
                        )}

                        <button
                            type="button"
                            className={global.buttonBrand}
                            onClick={saveItem}
                            disabled={saving}
                        >
                            {saving ? "Saving..." : isEditing ? "Update Item" : "Add Item"}
                        </button>
                    </div>
                </section>

                <section className={styles.section}>
                    <div className={styles.sectionHeaderRow}>
                        <div>
                            <h2 className={global.headLeft}>Recurring Items</h2>

                            <p>
                                Active items can be pulled into a monthly budget. Inactive items stay saved for historical reference.
                            </p>
                        </div>

                        <button
                            type="button"
                            className={global.linkBtn}
                            onClick={() => {
                                setShowInactiveItems((current) => !current);
                                setRecurringPages({
                                    income: 1,
                                    bill: 1,
                                    expected_expense: 1,
                                });
                            }}
                        >
                            {showInactiveItems ? "Hide Inactive" : "Show Inactive"}
                        </button>
                    </div>

                    {visibleItemCount === 0 ? (
                        <p className={styles.emptyState}>
                            {items.length === 0
                                ? "No recurring budget items yet. Add your first income, bill or expected expense above."
                                : "No active recurring budget items are currently shown. Use 'Show Inactive' to view inactive items."}
                        </p>
                    ) : (
                        <div className={styles.recurringGroups}>
                            {groupedItems.map((group) => (
                                <div key={group.itemType} className={styles.groupBlock}>
                                    <div className={styles.groupHeader}>
                                        <div>
                                            <h3>{group.label}</h3>
                                            <p>
                                                {group.totalItems} saved item{group.totalItems === 1 ? "" : "s"}
                                            </p>
                                        </div>

                                        <div className={styles.groupTotalBox}>
                                            <span className={styles.groupTotalLabel}>This Month&apos;s Estimate</span>
                                            <span className={styles.groupTotalValue}>
                                                {formatCurrency(group.expectedTotal)}
                                            </span>
                                        </div>
                                    </div>

                                    {group.items.length === 0 ? (
                                        <p className={styles.emptyState}>
                                            No active {group.label.toLowerCase()} items yet.
                                        </p>
                                    ) : (
                                        <>
                                            <div className={styles.itemList}>
                                                {group.items.map((item) => (
                                                    <div key={item.id} className={styles.itemCard}>
                                                        <div className={styles.itemMain}>
                                                            <div className={styles.itemTitleRow}>
                                                                <span className={styles.itemTitle}>
                                                                    {item.name}
                                                                </span>

                                                                <span className={item.is_active ? styles.activeBadge : styles.inactiveBadge}>
                                                                    {item.is_active ? "Active" : "Inactive"}
                                                                </span>
                                                            </div>

                                                            <div className={styles.itemDetails}>
                                                                <div>
                                                                    <span className={styles.detailLabel}>Frequency</span>
                                                                    <span className={styles.detailValue}>
                                                                        {getBudgetFrequencyLabel(item)}
                                                                    </span>
                                                                </div>

                                                                <div>
                                                                    <span className={styles.detailLabel}>Expected</span>
                                                                    <span className={styles.detailValue}>
                                                                        {formatCurrency(item.expected_amount)}
                                                                    </span>
                                                                </div>

                                                                <div>
                                                                    <span className={styles.detailLabel}>
                                                                        {getBudgetDateLabel(item.item_type)} Day
                                                                    </span>
                                                                    <span className={styles.detailValue}>
                                                                        {getBudgetDayDisplay(item)}
                                                                    </span>
                                                                </div>

                                                                <div>
                                                                    <span className={styles.detailLabel}>Start</span>
                                                                    <span className={styles.detailValue}>
                                                                        {normalizeBudgetDate(item.start_date) || "-"}
                                                                    </span>
                                                                </div>

                                                                <div>
                                                                    <span className={styles.detailLabel}>End</span>
                                                                    <span className={styles.detailValue}>
                                                                        {normalizeBudgetDate(item.end_date) || "-"}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {item.notes && (
                                                                <p className={styles.itemNotes}>
                                                                    {item.notes}
                                                                </p>
                                                            )}
                                                        </div>

                                                        <div className={styles.itemActions}>
                                                            <button
                                                                type="button"
                                                                className={global.iconButton}
                                                                onClick={() => editItem(item)}
                                                                aria-label={`Edit ${item.name}`}
                                                            >
                                                                <Pencil size={18} />
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className={global.iconButton}
                                                                onClick={() => openDeactivateModal(item)}
                                                                disabled={!item.is_active || deactivatingId === item.id}
                                                                aria-label={`Deactivate ${item.name}`}
                                                            >
                                                                <Trash size={18} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {group.totalItems > 0 && (
                                                <Pagination
                                                    currentPage={group.currentPage}
                                                    perPage={recurringPerPage}
                                                    totalItems={group.totalItems}
                                                    onPageChange={(newPage) => setRecurringPages((current) => ({
                                                        ...current,
                                                        [group.itemType]: newPage,
                                                    }))
                                                    }
                                                    onPerPageChange={(newPerPage) => {
                                                        setRecurringPerPage(newPerPage);
                                                        setRecurringPages({
                                                            income: 1,
                                                            bill: 1,
                                                            expected_expense: 1,
                                                        });
                                                    }}
                                                    label={group.itemType === "expected_expense" ? `expected expense(s)` : `${group.itemType}(s)`}
                                                />
                                            )}
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div >

            <BasicModal
                isOpen={Boolean(pendingDeactivateItem)}
                title="Deactivate Recurring Item?"
                cancelText="Cancel"
                confirmText={deactivatingId ? "Deactivating..." : "Yes, Deactivate"}
                onClose={closeDeavtivateModal}
                onConfirm={() => {
                    if (!pendingDeactivateItem) return;
                    deactivateItem(pendingDeactivateItem);
                }}
                disableConfirm={Boolean(deactivatingId)}
                message={
                    pendingDeactivateItem ? (
                        <div>
                            <p>
                                This will mark the item as inactive. It will stay saved, but it will not be used for new monthly budgets.
                            </p>

                            <div style={{ marginTop: "1rem" }}>
                                <p className={global.labelLine}>
                                    <strong>Name:</strong> {pendingDeactivateItem.name}
                                </p>

                                <p className={global.labelLine}>
                                    <strong>Type:</strong> {getBudgetItemTypeLabel(pendingDeactivateItem.item_type)}
                                </p>

                                <p className={global.labelLine}>
                                    <strong>Expected:</strong> {formatCurrency(pendingDeactivateItem.expected_amount)}
                                </p>
                            </div>
                        </div>
                    ) : null
                }
            />

            <BasicModal
                isOpen={showCreateBudgetModal}
                title="Create Budget"
                cancelText="Cancel"
                confirmText={creatingBudget ? "Creating..." : "Create Budget"}
                onClose={() => {
                    if (creatingBudget) return;

                    setShowCreateBudgetModal(false);
                    setNewBudgetName("");
                    setNewBudgetThemeKey("berries");
                }}
                onConfirm={createBudget}
                disableConfirm={creatingBudget || !newBudgetName.trim()}
                message={
                    <div className={styles.createBudgetFields}>
                        <div className={styles.field}>
                            <label className={global.label}>Budget Name</label>

                            <input
                                type="text"
                                className={global.input}
                                value={newBudgetName}
                                onChange={(event) => setNewBudgetName(event.target.value)}
                                placeholder="Vacation Budget"
                                autoFocus
                            />
                        </div>

                        <div className={styles.field}>
                            <label className={global.label}>Theme</label>

                            <select
                                className={global.input}
                                value={newBudgetThemeKey}
                                onChange={(event) =>
                                    setNewBudgetThemeKey(
                                        event.target.value as BudgetThemeKey
                                    )
                                }
                            >
                                {budgetThemeOptions.map((theme) => (
                                    <option key={theme.key} value={theme.key}>
                                        {theme.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.budgetThemePreview}>
                            <span
                                style={{
                                    background: selectedNewBudgetTheme.pending,
                                    color: selectedNewBudgetTheme.pendingText,
                                }}
                            >
                                Pending
                            </span>

                            <span
                                style={{
                                    background: selectedNewBudgetTheme.completed,
                                    color: selectedNewBudgetTheme.completedText,
                                }}
                            >
                                Completed
                            </span>

                            <span
                                style={{
                                    background: selectedNewBudgetTheme.skipped,
                                    color: selectedNewBudgetTheme.skippedText,
                                }}
                            >
                                Skipped
                            </span>
                        </div>
                    </div>
                }
            />
        </main >
    );
}