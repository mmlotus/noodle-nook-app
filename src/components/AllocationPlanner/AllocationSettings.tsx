"use client";

import { isValidMoneyInput } from "@/app/utils/formatMisc";
import { AllocationAccount, AllocationPreset, AllocationPresetForm, AllocationRuleForm } from "@/types/allocation";
import global from "@/styles/Global.module.css";
import styles from "@/styles/Budget.module.css";
import { Pencil, Plus, Star, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Link from "next/link";

function buildBlankRule(): AllocationRuleForm {
    return { destinationAccountId: "", fixedAmount: "", percentage: "" };
}

function buildBlankPreset(): AllocationPresetForm {
    return { name: "", sourceAccountId: "", rules: [buildBlankRule()] };
}

export default function AllocationSettings() {
    const [accounts, setAccounts] = useState<AllocationAccount[]>([]);
    const [presets, setPresets] = useState<AllocationPreset[]>([]);
    const [loading, setLoading] = useState(true);

    const [newAccountName, setNewAccountName] = useState("");
    const [editingAccountId, setEditingAccountId] = useState("");
    const [editingAccountName, setEditingAccountName] = useState("");
    const [savingAccount, setSavingAccount] = useState(false);
    const [deletingAccountId, setDeletingAccountId] = useState("");

    const [showPresetForm, setShowPresetForm] = useState(false);
    const [editingPresetId, setEditingPresetId] = useState("");
    const [presetForm, setPresetForm] = useState<AllocationPresetForm>(buildBlankPreset());
    const [savingPreset, setSavingPreset] = useState(false);
    const [deletingPresetId, setDeletingPresetId] = useState("");

    useEffect(() => {
        let cancelled = false;

        async function loadSettings() {
            try {
                const [accountsRes, presetsRes] = await Promise.all([
                    fetch("/api/allocation/accounts"),
                    fetch("/api/allocation/presets"),
                ]);

                const [accountsData, presetsData] = await Promise.all([
                    accountsRes.json(),
                    presetsRes.json(),
                ]);

                if (!accountsRes.ok) throw new Error(accountsData.error || "Failed to load accounts.");
                if (!presetsRes.ok) throw new Error(presetsData.error || "Failed to load presets.");
                if (cancelled) return;

                setAccounts((accountsData.accounts || []) as AllocationAccount[]);
                setPresets((presetsData.presets || []) as AllocationPreset[]);
            } catch (err) {
                console.error("loadAllocationSettings error:", err);
                if (!cancelled) toast.error("Could not load Allocation Planner settings.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        void loadSettings();

        return () => {
            cancelled = true;
        };
    }, []);

    async function reloadPresets() {
        const res = await fetch("/api/allocation/presets");
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Failed to reload presets.");
        setPresets((data.presets || []) as AllocationPreset[]);
    }

    async function addAccount() {
        const name = newAccountName.trim();

        if (!name) {
            toast.error("Please enter an account name.");
            return;
        }

        setSavingAccount(true);

        try {
            const res = await fetch("/api/allocation/accounts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to add account.");

            setAccounts((current) => [...current, data.account as AllocationAccount].sort((a, b) => a.name.localeCompare(b.name)));
            setNewAccountName("");
            toast.success("Account added.");
        } catch (err) {
            console.error("addAccount error:", err);
            toast.error(err instanceof Error ? err.message : "Could not add account.");
        } finally {
            setSavingAccount(false);
        }
    }

    function startEditAccount(account: AllocationAccount) {
        setEditingAccountId(account.id);
        setEditingAccountName(account.name);
    }

    function cancelEditAccount() {
        setEditingAccountId("");
        setEditingAccountName("");
    }

    async function saveAccount(accountId: string) {
        const name = editingAccountName.trim();

        if (!name) {
            toast.error("Account name is required.");
            return;
        }

        setSavingAccount(true);

        try {
            const res = await fetch(`/api/allocation/accounts/${accountId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to update account.");

            const savedAccount = data.account as AllocationAccount;

            setAccounts((current) =>
                current
                    .map((account) => account.id === savedAccount.id ? savedAccount : account)
                    .sort((a, b) => a.name.localeCompare(b.name))
            );

            await reloadPresets();
            cancelEditAccount();
            toast.success("Account updated.");
        } catch (err) {
            console.error("saveAccount error:", err);
            toast.error(err instanceof Error ? err.message : "Could not update account.");
        } finally {
            setSavingAccount(false);
        }
    }

    async function deleteAccount(account: AllocationAccount) {
        if (!window.confirm(`Delete "${account.name}"?`)) return;

        setDeletingAccountId(account.id);

        try {
            const res = await fetch(`/api/allocation/accounts/${account.id}`, { method: "DELETE" });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Failed to delete account.");

            setAccounts((current) => current.filter((item) => item.id !== account.id));
            toast.success("Account deleted.");
        } catch (err) {
            console.error("deleteAccount error:", err);
            toast.error(err instanceof Error ? err.message : "Could not delete account.");
        } finally {
            setDeletingAccountId("");
        }
    }

    function openNewPreset() {
        if (accounts.length === 0) {
            toast.error("Add at least one account first.");
            return;
        }

        setEditingPresetId("");
        setPresetForm({ ...buildBlankPreset(), sourceAccountId: accounts[0].id });
        setShowPresetForm(true);
    }

    function openEditPreset(preset: AllocationPreset) {
        setEditingPresetId(preset.id);
        setPresetForm({
            name: preset.name,
            sourceAccountId: preset.sourceAccountId,
            rules: preset.rules.map((rule) => ({
                destinationAccountId: rule.destinationAccountId,
                fixedAmount: rule.fixedAmount ? String(rule.fixedAmount) : "",
                percentage: rule.percentage ? String(rule.percentage) : "",
            })),
        });
        setShowPresetForm(true);
    }

    function closePresetForm() {
        if (savingPreset) return;

        setShowPresetForm(false);
        setEditingPresetId("");
        setPresetForm(buildBlankPreset());
    }

    async function setDefaultPreset(preset: AllocationPreset) {
        try {
            const res = await fetch(`/api/allocation/presets/${preset.id}/default`, {
                method: "PATCH",
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to set default preset.");

            setPresets((current) =>
                current.map((item) => ({
                    ...item,
                    isDefault: item.id === preset.id,
                }))
            );

            toast.success(`${preset.name} is now your default plan.`);
        } catch (err) {
            console.error("setDefaultPreset error:", err);
            toast.error(err instanceof Error ? err.message : "Could not set default plan.");
        }
    }

    function updateRule(index: number, key: keyof AllocationRuleForm, value: string) {
        setPresetForm((current) => ({
            ...current,
            rules: current.rules.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, [key]: value } : rule),
        }));
    }

    function addRule() {
        setPresetForm((current) => ({ ...current, rules: [...current.rules, buildBlankRule()] }));
    }

    function removeRule(index: number) {
        setPresetForm((current) => ({ ...current, rules: current.rules.filter((_, ruleIndex) => ruleIndex !== index) }));
    }

    async function savePreset() {
        const name = presetForm.name.trim();

        if (!name) {
            toast.error("Please enter a plan name.");
            return;
        }

        if (!presetForm.sourceAccountId) {
            toast.error("Please select a source account.");
            return;
        }

        if (presetForm.rules.length === 0) {
            toast.error("Please add at least one destination.");
            return;
        }

        const usedDestinations = new Set<string>();
        let totalPercentage = 0;

        for (const rule of presetForm.rules) {
            const fixedAmount = Number(rule.fixedAmount || 0);
            const percentage = Number(rule.percentage || 0);

            if (!rule.destinationAccountId) {
                toast.error("Please select an account for every destination.");
                return;
            }

            if (usedDestinations.has(rule.destinationAccountId)) {
                toast.error("The same destination account cannot be used more than once.");
                return;
            }

            if (!Number.isFinite(fixedAmount) || fixedAmount < 0) {
                toast.error("Fixed amounts cannot be negative.");
                return;
            }

            if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
                toast.error("Percentages must be between 0 and 100.");
                return;
            }

            if (fixedAmount === 0 && percentage === 0) {
                toast.error("Each destination needs a fixed amount, percentage, or both.");
                return;
            }

            usedDestinations.add(rule.destinationAccountId);
            totalPercentage += percentage;
        }

        if (totalPercentage > 100) {
            toast.error("Total percentage allocations cannot exceed 100%.");
            return;
        }

        setSavingPreset(true);

        try {
            const isEditing = Boolean(editingPresetId);
            const res = await fetch(
                isEditing ? `/api/allocation/presets/${editingPresetId}` : "/api/allocation/presets",
                {
                    method: isEditing ? "PATCH" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name,
                        sourceAccountId: presetForm.sourceAccountId,
                        rules: presetForm.rules.map((rule) => ({
                            destinationAccountId: rule.destinationAccountId,
                            fixedAmount: Number(rule.fixedAmount || 0),
                            percentage: Number(rule.percentage || 0),
                        })),
                    }),
                }
            );

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to save preset.");

            await reloadPresets();
            closePresetForm();
            toast.success(isEditing ? "Preset updated." : "Preset created.");
        } catch (err) {
            console.error("savePreset error:", err);
            toast.error(err instanceof Error ? err.message : "Could not save preset.");
        } finally {
            setSavingPreset(false);
        }
    }

    async function deletePreset(preset: AllocationPreset) {
        if (!window.confirm(`Delete "${preset.name}"?`)) return;

        setDeletingPresetId(preset.id);

        try {
            const res = await fetch(`/api/allocation/presets/${preset.id}`, { method: "DELETE" });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Failed to delete preset.");

            setPresets((current) => current.filter((item) => item.id !== preset.id));
            toast.success("Preset deleted.");
        } catch (err) {
            console.error("deletePreset error:", err);
            toast.error(err instanceof Error ? err.message : "Could not delete preset.");
        } finally {
            setDeletingPresetId("");
        }
    }

    if (loading) return <p>Loading Allocation Planner settings...</p>;

    return (
        <>
            <section className={global.section}>
                <div className={styles.sectionHeaderRow}>
                    <div>
                        <h2 className={global.headLeft}>Allocation Planner Accounts</h2>
                        <p>Save the accounts you use as sources and destinations in allocation presets.</p>
                    </div>

                    <Link href="/allocation" className={global.buttonBrand}>
                        Open Planner
                    </Link>
                </div>

                <div className={global.inputGroup}>
                    <input
                        className={global.input}
                        value={newAccountName}
                        onChange={(e) => setNewAccountName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                void addAccount();
                            }
                        }}
                        placeholder="Business Checking, Savings 1234..."
                    />

                    <button
                        type="button"
                        className={global.buttonBrand}
                        onClick={addAccount}
                        disabled={savingAccount}
                    >
                        {savingAccount ? "Adding..." : "Add Account"}
                    </button>
                </div>

                {accounts.length === 0 ? (
                    <div className={styles.emptyState}>
                        <p>No saved accounts yet.</p>
                    </div>
                ) : (
                    <div className={styles.itemList}>
                        {accounts.map((account) => (
                            <div key={account.id} className={styles.itemCard}>
                                <div className={styles.itemMain}>
                                    {editingAccountId === account.id ? (
                                        <input
                                            className={global.input}
                                            value={editingAccountName}
                                            onChange={(e) => setEditingAccountName(e.target.value)}
                                            autoFocus
                                        />
                                    ) : (
                                        <span className={styles.itemTitle}>{account.name}</span>
                                    )}
                                </div>

                                <div className={styles.itemActions}>
                                    {editingAccountId === account.id ? (
                                        <>
                                            <button
                                                type="button"
                                                className={global.buttonBrand}
                                                onClick={() => saveAccount(account.id)}
                                                disabled={savingAccount}
                                            >
                                                Save
                                            </button>

                                            <button
                                                type="button"
                                                className={global.buttonSecondary}
                                                onClick={cancelEditAccount}
                                                disabled={savingAccount}
                                            >
                                                Cancel
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                type="button"
                                                className={global.iconButton}
                                                onClick={() => startEditAccount(account)}
                                                title="Edit"
                                            >
                                                <Pencil size={16} />
                                            </button>

                                            <button
                                                type="button"
                                                className={global.iconButton}
                                                onClick={() => deleteAccount(account)}
                                                disabled={deletingAccountId === account.id}
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <section className={global.section}>
                <div className={styles.sectionHeaderRow}>
                    <div>
                        <h2 className={global.headLeft}>Allocation Planner Presets</h2>
                        <p>Save reusable rules for how money should move between your accounts.</p>
                    </div>

                    <button
                        type="button"
                        className={global.buttonSecondary}
                        onClick={openNewPreset}
                    >
                        <Plus size={16} />
                        New Preset
                    </button>
                </div>

                {presets.length === 0 ? (
                    <div className={styles.emptyState}>
                        <p>No saved presets yet.</p>
                    </div>
                ) : (
                    <div className={styles.itemList}>
                        {presets.map((preset) => (
                            <div key={preset.id} className={styles.itemCard}>
                                <div className={styles.itemMain}>
                                    <div className={styles.itemTitleRow}>
                                        <span className={styles.itemTitle}>{preset.name}</span>

                                        {preset.isDefault && (
                                            <span className={styles.activeBadge}>Default</span>
                                        )}
                                    </div>

                                    <div className={styles.itemDetails}>
                                        <div>
                                            <span className={styles.detailLabel}>Source</span>
                                            <span className={styles.detailValue}>{preset.sourceAccountName}</span>
                                        </div>

                                        <div>
                                            <span className={styles.detailLabel}>Destinations</span>
                                            <span className={styles.detailValue}>{preset.rules.length}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.itemActions}>
                                    <button
                                        type="button"
                                        className={global.iconButton}
                                        onClick={() => setDefaultPreset(preset)}
                                        disabled={preset.isDefault}
                                        title={preset.isDefault ? "Default Plan" : "Set as Default"}
                                        aria-label={preset.isDefault ? "Default Plan" : `Set ${preset.name} as default`}
                                    >
                                        {preset.isDefault ? <Star size={20} color={"#fcb127"} fill={"#fcb127"}/> : <Star size={16} />}
                                    </button>

                                    <button
                                        type="button"
                                        className={global.iconButton}
                                        onClick={() => openEditPreset(preset)}
                                        title="Edit"
                                    >
                                        <Pencil size={16} />
                                    </button>

                                    <button
                                        type="button"
                                        className={global.iconButton}
                                        onClick={() => deletePreset(preset)}
                                        disabled={deletingPresetId === preset.id}
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {showPresetForm && (
                <div className={styles.budgetModalOverlay} onClick={closePresetForm} role="presentation">
                    <div
                        className={styles.budgetModal}
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="allocation-preset-title"
                    >
                        <div className={styles.budgetModalHeader}>
                            <div>
                                <h2 id="allocation-preset-title">{editingPresetId ? "Edit Preset" : "New Preset"}</h2>
                                <p>Choose the source account and the rules for each destination.</p>
                            </div>

                            <button
                                type="button"
                                className={global.iconButton}
                                onClick={closePresetForm}
                                disabled={savingPreset}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className={styles.budgetModalBody}>
                            <div className={styles.generateMonthGrid}>
                                <div className={styles.field}>
                                    <label className={global.label}>Plan Name</label>
                                    <input
                                        className={global.input}
                                        value={presetForm.name}
                                        onChange={(e) => setPresetForm((current) => ({ ...current, name: e.target.value }))}
                                        placeholder="Business Income Split, Vacation Fund..."
                                    />
                                </div>

                                <div className={styles.field}>
                                    <label className={global.label}>Source Account</label>
                                    <select
                                        className={global.input}
                                        value={presetForm.sourceAccountId}
                                        onChange={(e) => setPresetForm((current) => ({ ...current, sourceAccountId: e.target.value }))}
                                    >
                                        <option value="">Select account</option>
                                        {accounts.map((account) => (
                                            <option key={account.id} value={account.id}>{account.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className={styles.sectionHeaderRow} style={{ marginTop: "28px" }}>
                                <div>
                                    <h2 className={global.headLeft}>Destinations</h2>
                                    <p>Each destination can have a fixed amount, percentage, or both.</p>
                                </div>

                                <button
                                    type="button"
                                    className={global.buttonSecondary}
                                    onClick={addRule}
                                >
                                    <Plus size={15} />
                                    Add Destination
                                </button>
                            </div>

                            <div className={styles.itemList}>
                                {presetForm.rules.map((rule, index) => (
                                    <div key={index} className={styles.itemCard}>
                                        <div className={styles.itemMain}>
                                            <div className={styles.formGrid}>
                                                <div className={styles.field}>
                                                    <label className={global.label}>Account</label>
                                                    <select
                                                        className={global.input}
                                                        value={rule.destinationAccountId}
                                                        onChange={(e) => updateRule(index, "destinationAccountId", e.target.value)}
                                                    >
                                                        <option value="">Select account</option>
                                                        {accounts
                                                            .filter((account) => account.id !== presetForm.sourceAccountId)
                                                            .map((account) => (
                                                                <option key={account.id} value={account.id}>{account.name}</option>
                                                            ))}
                                                    </select>
                                                </div>

                                                <div className={styles.field}>
                                                    <label className={global.label}>Fixed Amount</label>
                                                    <input
                                                        type="text"
                                                        inputMode="decimal"
                                                        className={global.input}
                                                        value={rule.fixedAmount}
                                                        onChange={(e) => {
                                                            if (isValidMoneyInput(e.target.value)) updateRule(index, "fixedAmount", e.target.value);
                                                        }}
                                                        placeholder="0.00"
                                                    />
                                                </div>

                                                <div className={styles.field}>
                                                    <label className={global.label}>Percentage</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        step="0.01"
                                                        className={global.input}
                                                        value={rule.percentage}
                                                        onChange={(e) => updateRule(index, "percentage", e.target.value)}
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className={styles.itemActions}>
                                            <button
                                                type="button"
                                                className={global.iconButton}
                                                onClick={() => removeRule(index)}
                                                disabled={presetForm.rules.length === 1}
                                                title="Remove"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className={styles.budgetModalFooter}>
                            <span className={styles.detailValue}>Anything not allocated stays in the source account.</span>

                            <div className={styles.budgetModalActions}>
                                <button
                                    type="button"
                                    className={global.buttonSecondary}
                                    onClick={closePresetForm}
                                    disabled={savingPreset}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="button"
                                    className={global.buttonBrand}
                                    onClick={savePreset}
                                    disabled={savingPreset}
                                >
                                    {savingPreset ? "Saving..." : editingPresetId ? "Save Changes" : "Create Preset"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}