"use client";

import Banner from "@/components/Images/banner";
import LoadingSpinner from "@/components/LoadingSpinner";
import { formatCurrency, isValidMoneyInput } from "@/app/utils/formatMisc";
import { AllocationCalculation, AllocationPreset } from "@/types/allocation";
import global from "@/styles/Global.module.css";
import styles from "@/styles/Budget.module.css";
import { ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

export default function AllocationPlannerPage() {
    const [presets, setPresets] = useState<AllocationPreset[]>([]);
    const [history, setHistory] = useState<AllocationCalculation[]>([]);
    const [selectedPresetId, setSelectedPresetId] = useState("");
    const [amountToAllocate, setAmountToAllocate] = useState("");
    const [calculation, setCalculation] = useState<AllocationCalculation | null>(null);
    const [expandedHistoryId, setExpandedHistoryId] = useState("");
    const [loading, setLoading] = useState(true);
    const [calculating, setCalculating] = useState(false);

    const selectedPreset = useMemo(
        () => presets.find((preset) => preset.id === selectedPresetId) || null,
        [presets, selectedPresetId]
    );

    useEffect(() => {
        let cancelled = false;

        async function loadAllocationPlanner() {
            try {
                const [presetsRes, historyRes] = await Promise.all([
                    fetch("/api/allocation/presets"),
                    fetch("/api/allocation/history"),
                ]);

                const [presetsData, historyData] = await Promise.all([
                    presetsRes.json(),
                    historyRes.json(),
                ]);

                if (!presetsRes.ok) throw new Error(presetsData.error || "Failed to load presets.");
                if (!historyRes.ok) throw new Error(historyData.error || "Failed to load allocation history.");
                if (cancelled) return;

                const loadedPresets = (presetsData.presets || []) as AllocationPreset[];

                setPresets(loadedPresets);
                setHistory((historyData.history || []) as AllocationCalculation[]);

                if (loadedPresets.length > 0) {
                    const defaultPreset = loadedPresets.find((preset) => preset.isDefault);
                    setSelectedPresetId(defaultPreset?.id || loadedPresets[0].id);
                }
            } catch (err) {
                console.error("loadAllocationPlanner error:", err);
                if (!cancelled) toast.error("Could not load Allocation Planner.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        void loadAllocationPlanner();

        return () => {
            cancelled = true;
        };
    }, []);

    async function calculateAllocation() {
        if (!selectedPresetId) {
            toast.error("Please select a preset.");
            return;
        }

        const amount = Number(amountToAllocate);

        if (!Number.isFinite(amount) || amount <= 0) {
            toast.error("Please enter an amount greater than $0.");
            return;
        }

        setCalculating(true);

        try {
            const res = await fetch("/api/allocation/calculate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ presetId: selectedPresetId, amountToAllocate: amount }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to calculate allocation.");

            const savedCalculation = data.calculation as AllocationCalculation;

            setCalculation(savedCalculation);
            setHistory((current) => [
                savedCalculation,
                ...current.filter((item) => item.id !== savedCalculation.id),
            ].slice(0, 50));
        } catch (err) {
            console.error("calculateAllocation error:", err);
            toast.error(err instanceof Error ? err.message : "Could not calculate allocation.");
        } finally {
            setCalculating(false);
        }
    }

    if (loading) return <LoadingSpinner />;

    return (
        <main className={global.pageWrapper}>
            <Banner
                type="default"
                title="Allocation Planner"
                subtitle="See exactly how much money should move to each account."
            />

            <div className={styles.budgetPage}>
                <section className={styles.section}>
                    <div className={styles.sectionHeaderRow}>
                        <div>
                            <h2 className={global.headLeft}>Calculate Allocation</h2>
                            <p>Select a saved preset and enter the total amount you want to allocate.</p>
                        </div>

                        <Link href="/profile" className={global.link}>
                            Manage Settings
                        </Link>
                    </div>

                    {presets.length === 0 ? (
                        <div className={styles.emptyState}>
                            <strong>No allocation presets yet.</strong>
                            <p>Create your accounts and presets in your profile settings first.</p>
                            <div className={styles.actions}>
                                <Link href="/profile" className={global.buttonBrand}>
                                    Set Up Allocation Planner
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className={styles.generateMonthGrid}>
                                <div className={styles.field}>
                                    <label className={global.label}>Preset</label>
                                    <select
                                        className={global.input}
                                        value={selectedPresetId}
                                        onChange={(e) => {
                                            setSelectedPresetId(e.target.value);
                                            setCalculation(null);
                                        }}
                                    >
                                        {presets.map((preset) => (
                                            <option key={preset.id} value={preset.id}>
                                                {preset.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className={styles.field}>
                                    <label className={global.label}>Amount to Allocate</label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        className={global.input}
                                        value={amountToAllocate}
                                        onChange={(e) => {
                                            if (!isValidMoneyInput(e.target.value)) return;
                                            setAmountToAllocate(e.target.value);
                                            setCalculation(null);
                                        }}
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            {selectedPreset && (
                                <div className={styles.summaryGrid}>
                                    <div className={styles.summaryCard}>
                                        <span className={styles.groupTotalLabel}>Source Account</span>
                                        <strong>{selectedPreset.sourceAccountName}</strong>
                                    </div>

                                    <div className={styles.summaryCard}>
                                        <span className={styles.groupTotalLabel}>Destinations</span>
                                        <strong>{selectedPreset.rules.length}</strong>
                                    </div>
                                </div>
                            )}

                            <div className={styles.actions}>
                                <button
                                    type="button"
                                    className={global.buttonBrand}
                                    onClick={calculateAllocation}
                                    disabled={calculating || !amountToAllocate}
                                >
                                    {calculating ? "Calculating..." : "Calculate"}
                                </button>
                            </div>
                        </>
                    )}
                </section>

                {calculation && (
                    <section className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h2 className={global.headLeft}>Transfer Plan</h2>
                            <p>
                                {formatCurrency(calculation.amountToAllocate)} using{" "}
                                <strong>{calculation.presetName}</strong>
                            </p>
                        </div>

                        <div className={styles.itemList}>
                            {calculation.results.map((result, index) => (
                                <div key={`${result.destinationAccountId}-${index}`} className={styles.itemCard}>
                                    <div className={styles.itemMain}>
                                        <div className={styles.itemTitleRow}>
                                            <span className={styles.itemTitle}>
                                                {index + 1}. Move {formatCurrency(result.calculatedAmount)}
                                            </span>
                                        </div>

                                        <div className={styles.itemDetails}>
                                            <div>
                                                <span className={styles.detailLabel}>From</span>
                                                <span className={styles.detailValue}>{calculation.sourceAccountName}</span>
                                            </div>

                                            <div>
                                                <span className={styles.detailLabel}>To</span>
                                                <span className={styles.detailValue}>{result.destinationAccountName}</span>
                                            </div>

                                            {result.fixedAmount > 0 && (
                                                <div>
                                                    <span className={styles.detailLabel}>Fixed Amount</span>
                                                    <span className={styles.detailValue}>{formatCurrency(result.fixedAmount)}</span>
                                                </div>
                                            )}

                                            {result.percentage > 0 && (
                                                <div>
                                                    <span className={styles.detailLabel}>Percentage</span>
                                                    <span className={styles.detailValue}>{result.percentage}%</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <div className={styles.itemCard}>
                                <div className={styles.itemMain}>
                                    <div className={styles.itemTitleRow}>
                                        <span className={styles.itemTitle}>
                                            Leave {formatCurrency(calculation.amountRemaining)} in {calculation.sourceAccountName}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className={styles.summaryGrid}>
                            <div className={styles.summaryCard}>
                                <span className={styles.groupTotalLabel}>Total Moved</span>
                                <strong>{formatCurrency(calculation.totalAllocated)}</strong>
                            </div>

                            <div className={styles.summaryCard}>
                                <span className={styles.groupTotalLabel}>Left in Source</span>
                                <strong>{formatCurrency(calculation.amountRemaining)}</strong>
                            </div>

                            <div className={styles.summaryCard}>
                                <span className={styles.groupTotalLabel}>Total Accounted For</span>
                                <strong>{formatCurrency(calculation.amountToAllocate)}</strong>
                            </div>
                        </div>
                    </section>
                )}

                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={global.headLeft}>Recent Calculations</h2>
                        <p>Your 50 most recent calculations are kept here.</p>
                    </div>

                    {history.length === 0 ? (
                        <div className={styles.emptyState}>
                            <p>No calculations yet.</p>
                        </div>
                    ) : (
                        <div className={styles.recurringGroups}>
                            {history.map((item) => {
                                const expanded = expandedHistoryId === item.id;

                                return (
                                    <div key={item.id} className={styles.groupBlock}>
                                        <div className={styles.groupHeader}>
                                            <div>
                                                <h3>{item.presetName}</h3>
                                                <p>{new Date(item.createdAt).toLocaleString()}</p>
                                            </div>

                                            <div className={styles.itemActions}>
                                                <strong>{formatCurrency(item.amountToAllocate)}</strong>
                                                <button
                                                    type="button"
                                                    className={global.iconButton}
                                                    onClick={() => setExpandedHistoryId(expanded ? "" : item.id)}
                                                    aria-label={expanded ? "Collapse calculation" : "Expand calculation"}
                                                >
                                                    {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                </button>
                                            </div>
                                        </div>

                                        {expanded && (
                                            <div className={styles.itemList}>
                                                {item.results.map((result, index) => (
                                                    <div key={`${item.id}-${index}`} className={styles.itemCard}>
                                                        <div className={styles.itemMain}>
                                                            <div className={styles.itemDetails}>
                                                                <div>
                                                                    <span className={styles.detailLabel}>Destination</span>
                                                                    <span className={styles.detailValue}>{result.destinationAccountName}</span>
                                                                </div>

                                                                <div>
                                                                    <span className={styles.detailLabel}>Move</span>
                                                                    <span className={styles.detailValue}>
                                                                        {formatCurrency(result.calculatedAmount)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}

                                                <div className={styles.itemCard}>
                                                    <div className={styles.itemMain}>
                                                        <span className={styles.detailLabel}>
                                                            Leave in {item.sourceAccountName}
                                                        </span>
                                                        <span className={styles.detailValue}>
                                                            {formatCurrency(item.amountRemaining)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}