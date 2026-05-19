"use client";

import { WeightEntry } from "@/lib/weight/weightEntries";
import global from "@/styles/Global.module.css";
import styles from "@/styles/Weight.module.css";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { formatDate, getTodayDateString } from "../utils/formatDate";
import { fromPounds, toPounds, WeightUnit, weightUnitOptions } from "@/lib/weight/weightUtils";
import LoadingSpinner from "@/components/LoadingSpinner";
import Banner from "@/components/Images/banner";
import { ChartRange, UserRow } from "@/types";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import Pagination from "@/components/Pagination";
import { ArrowDownWideNarrow, Pencil, Trash } from "lucide-react";
import BasicModal from "@/components/Modals/PopupModal";

export default function WeightTrackerPage() {
    const [entries, setEntries] = useState<WeightEntry[]>([]);
    const [profile, setProfile] = useState<UserRow | null>(null);

    const [entryDate, setEntryDate] = useState(getTodayDateString());
    const [weightValue, setWeightValue] = useState("");
    const [entryUnit, setEntryUnit] = useState<WeightUnit>("lb");
    const [preferredUnit, setPreferredUnit] = useState<WeightUnit>("lb");
    const [notes, setNotes] = useState("");

    const [chartRange, setChartRange] = useState<ChartRange>("all");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [pendingDeleteEntry, setPendingDeleteEntry] = useState<WeightEntry | null>(null);
    const [deletingDate, setDeletingDate] = useState("");

    const [savingPref, setSavingPref] = useState(false);

    const [historyStartDate, setHistoryStartDate] = useState("");
    const [historyEndDate, setHistoryEndDate] = useState("");
    const [historyPage, setHistoryPage] = useState(1);
    const [historyPerPage, setHistoryPerPage] = useState(10);
    const [historySort, setHistorySort] = useState<"newest" | "oldest" | "highest" | "lowest">("newest");
    const [sortMenuOpen, setSortMenuOpen] = useState(false);

    const filteredHistoryEntries = useMemo(() => {
        return entries.filter((entry) => {
            const cleanDate = entry.entry_date.split("T")[0];

            if (historyStartDate && cleanDate < historyStartDate) return false;
            if (historyEndDate && cleanDate > historyEndDate) return false;

            return true;
        })
            .sort((a, b) => {
                if (historySort === "newest") {
                    return b.entry_date.localeCompare(a.entry_date);
                }

                if (historySort === "oldest") {
                    return a.entry_date.localeCompare(b.entry_date);
                }

                if (historySort === "highest") {
                    return Number(b.weight_lb) - Number(a.weight_lb);
                }

                if (historySort === "lowest") {
                    return Number(a.weight_lb) - Number(b.weight_lb);
                }

                return 0;
            });
    }, [entries, historyStartDate, historyEndDate, historySort]);

    const paginatedHistoryEntries = useMemo(() => {
        const startIndex = (historyPage - 1) * historyPerPage;
        return filteredHistoryEntries.slice(startIndex, startIndex + historyPerPage);
    }, [filteredHistoryEntries, historyPage, historyPerPage]);

    function clearHistoryFilters() {
        setHistoryStartDate("");
        setHistoryEndDate("");
        setHistoryPage(1);
    }

    const selectedEntry = useMemo(() => {
        return entries.find((entry) => entry.entry_date.split("T")[0] === entryDate);
    }, [entries, entryDate]);

    const filteredChartEntries = useMemo(() => {
        if (chartRange === "all") {
            return entries;
        }

        const now = new Date();
        const cutoff = new Date(now);

        if (chartRange === "7d") {
            cutoff.setDate(now.getDate() - 7);
        }

        if (chartRange === "30d") {
            cutoff.setDate(now.getDate() - 30);
        }

        if (chartRange === "90d") {
            cutoff.setDate(now.getDate() - 90);
        }

        if (chartRange === "6m") {
            cutoff.setMonth(now.getMonth() - 6);
        }

        if (chartRange === "1y") {
            cutoff.setFullYear(now.getFullYear() - 1);
        }

        const cutoffString = cutoff.toISOString().split("T")[0];

        return entries.filter((entry) => {
            const cleanDate = entry.entry_date.split("T")[0];
            return cleanDate >= cutoffString;
        });
    }, [entries, chartRange]);

    const chartData = useMemo(() => {
        return filteredChartEntries.map((entry) => {
            const cleanDate = entry.entry_date.split("T")[0];
            const displayWeight = fromPounds(Number(entry.weight_lb), preferredUnit);

            return {
                date: cleanDate,
                label: formatDate(entry.entry_date),
                weight: preferredUnit === "g"
                    ? Math.round(displayWeight)
                    : Number(displayWeight.toFixed(2)),
            };
        });
    }, [filteredChartEntries, preferredUnit]);

    const stats = useMemo(() => {
        if (entries.length === 0) {
            return {
                current: null,
                starting: null,
                totalChange: null,
                entriesLogged: 0,
            };
        }

        const startingEntry = entries[0];
        const currentEntry = entries[entries.length - 1];

        const starting = fromPounds(Number(startingEntry.weight_lb), preferredUnit);
        const current = fromPounds(Number(currentEntry.weight_lb), preferredUnit);
        const totalChange = current - starting;

        return {
            current,
            starting,
            totalChange,
            entriesLogged: entries.length,
        };
    }, [entries, preferredUnit]);

    function formatDisplayWeight(value: number | null) {
        if (value === null) return "-";

        if (preferredUnit === "g") {
            return `${Math.round(value).toLocaleString()}${preferredUnit}`;
        }

        return `${value.toFixed(2)}${preferredUnit}`;
    }

    function getChartRangeLabel(range: ChartRange) {
        if (range === "7d") return "Last 7 Days";
        if (range === "30d") return "Last 30 Days";
        if (range === "90d") return "Last 90 Days";
        if (range === "6m") return "Last 6 Months";
        if (range === "1y") return "Last Year";
        return "All Time";
    }

    async function loadPageData() {
        try {
            const [entriesRes, profileRes] = await Promise.all([
                fetch("/api/weight-entries"),
                fetch("/api/profiles/user-profile"),
            ]);

            if (!entriesRes.ok) {
                throw new Error("Failed to load weight entries.");
            }

            if (!profileRes.ok) {
                throw new Error("Failed to load profile.");
            }

            const entriesData = await entriesRes.json();
            const profileData = await profileRes.json();

            return {
                entries: entriesData.entries || [],
                profile: profileData,
                savedUnit: profileData.preferred_weight_unit || "lb",
            };
        } catch (err) {
            console.error("loadPageData error:", err);
            toast.error("Could not load weight tracker.");

            return null;
        }
    }

    useEffect(() => {
        let cancelled = false;

        async function run() {
            const data = await loadPageData();

            if (!data || cancelled) return;

            setEntries(data.entries);
            setProfile(data.profile);
            setPreferredUnit(data.savedUnit);
            setEntryUnit(data.savedUnit);
            setLoading(false);
        }

        run();

        return () => {
            cancelled = true;
        };
    }, []);

    async function handleSave() {
        setSaving(true);

        const numericWeight = Number(weightValue);

        if (!entryDate) {
            toast.error("Please choose a date.");
            setSaving(false);
            return;
        }

        if (!Number.isFinite(numericWeight) || numericWeight <= 0) {
            toast.error("Please enter a valid weight.");
            setSaving(false);
            return;
        }

        try {
            const weightLb = toPounds(numericWeight, entryUnit);

            const res = await fetch("/api/weight-entries", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    entry_date: entryDate,
                    weight_lb: weightLb,
                    notes,
                }),
            });

            if (!res.ok) {
                throw new Error("Failed to save weight entry.");
            }

            const data = await res.json();

            setEntries((current) => {
                const updatedEntry = data.entry as WeightEntry;
                const updatedDate = updatedEntry.entry_date.split("T")[0];

                const existingIndex = current.findIndex((entry) =>
                    entry.entry_date.split("T")[0] === updatedDate
                );

                if (existingIndex === -1) {
                    return [...current, updatedEntry].sort((a, b) =>
                        a.entry_date.localeCompare(b.entry_date)
                    );
                }

                return current.map((entry, index) => index === existingIndex ? updatedEntry : entry);
            });

            toast.success(selectedEntry ? "Weight updated!" : "Weight saved!");
        } catch (err) {
            console.error("handleSave error:", err);
            toast.error("Could not save weight entry.");
        } finally {
            setSaving(false);
        }
    }

    function openDeleteModal(entry: WeightEntry) {
        setPendingDeleteEntry(entry);
    }

    function closeDeleteModal() {
        if (deletingDate) return;
        setPendingDeleteEntry(null);
    }

    async function handleDelete(entryDateToDelete: string) {
        const normalizedDate = entryDateToDelete.split("T")[0];
        setDeletingDate(normalizedDate);

        try {
            const res = await fetch("/api/weight-entries", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    entry_date: normalizedDate,
                }),
            });

            if (!res.ok) {
                throw new Error("Failed to delete weight entry.");
            }

            setEntries((current) => current.filter((entry) =>
                entry.entry_date.split("T")[0] !== normalizedDate
            ));

            if (normalizedDate === entryDate) {
                setWeightValue("");
                setNotes("");
            }

            setPendingDeleteEntry(null);
            toast.success("Weight entry deleted!");
        } catch (err) {
            console.error("handleDelete error:", err);
            toast.error("Could not delete weight entry.");
        } finally {
            setDeletingDate("");
        }
    }

    async function handlePreferredUnitChange(nextUnit: WeightUnit) {
        setPreferredUnit(nextUnit);

        if (!profile) {
            toast.error("Could not update preference.");
            return;
        }

        setSavingPref(true);

        try {
            const res = await fetch("/api/profiles/user-profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: profile.name,
                    subtitle_choice: profile.subtitle_choice || "",
                    theme_preference: profile.theme_preference || "system",
                    preferred_weight_unit: nextUnit,
                }),
            });

            if (!res.ok) {
                throw new Error("Failed to save preferred unit.");
            }

            const data = await res.json();

            setProfile(data.user);
            toast.success("Weight unit preference updated!");
        } catch (err) {
            console.error("handlePreferredUnitChange error:", err);
            toast.error("Could not update weight unit preference.");
        } finally {
            setSavingPref(false);
        }
    }

    function fillFormFromEntry(entry: WeightEntry, unit: WeightUnit) {
        const convertedWeight = fromPounds(Number(entry.weight_lb), unit);

        setWeightValue(unit === "g"
            ? String(Math.round(convertedWeight))
            : convertedWeight.toFixed(2)
        );

        setNotes(entry.notes || "");
    }

    function handleEntryDateChange(nextDate: string) {
        setEntryDate(nextDate);

        const matchingEntry = entries.find((entry) => entry.entry_date.split("T")[0] === nextDate);

        if (matchingEntry) {
            fillFormFromEntry(matchingEntry, entryUnit);
        } else {
            setWeightValue("");
            setNotes("");
        }
    }

    function handleEntryUnitChange(nextUnit: WeightUnit) {
        setEntryUnit(nextUnit);

        if (selectedEntry) {
            fillFormFromEntry(selectedEntry, nextUnit);
        }
    }

    function handleEdit(entry: WeightEntry) {
        const cleanDate = entry.entry_date.split("T")[0];

        setEntryDate(cleanDate);
        setEntryUnit(preferredUnit);
        fillFormFromEntry(entry, preferredUnit);

        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    if (loading) return <LoadingSpinner />;

    return (
        <main className={global.pageWrapper}>
            <Banner
                type="default"
                title="Weight Tracker"
                subtitle="Log your weight & track your progress over time."
            />

            <div className={styles.weightPage}>
                {/* QUICK ENTRY */}
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={global.headLeft}>
                            {selectedEntry ? "Edit Weight Entry" : "Add Weight Entry"}
                        </h2>

                        <p>Save today&apos;s weight or update an existing date.</p>
                    </div>

                    <div className={styles.quickEntryGrid}>
                        <div className={styles.field}>
                            <label className={global.label}>Date</label>
                            <input
                                type="date"
                                className={global.input}
                                value={entryDate}
                                onChange={(e) => handleEntryDateChange(e.target.value)}
                            />
                        </div>

                        <div className={styles.field}>
                            <label className={global.label}>Weight</label>
                            <input
                                type="number"
                                className={global.input}
                                step={0.01}
                                min={0}
                                value={weightValue}
                                onChange={(e) => setWeightValue(e.target.value)}
                                placeholder="Enter weight"
                            />
                        </div>

                        <div className={styles.field}>
                            <label className={global.label}>Unit</label>
                            <select
                                className={global.input}
                                value={entryUnit}
                                onChange={(e) => handleEntryUnitChange(e.target.value as WeightUnit)}
                            >
                                {weightUnitOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className={`${styles.field} ${styles.notesField}`}>
                            <label className={global.label}>Notes</label>
                            <textarea
                                className={global.textarea}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="(optional)"
                            />
                        </div>
                    </div>

                    <div className={styles.actions}>
                        <button
                            type="button"
                            className={global.buttonBrand}
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? "Saving..." : selectedEntry ? "Update Weight" : "Save Weight"}
                        </button>

                        {selectedEntry && (
                            <button
                                type="button"
                                className={global.buttonSecondary}
                                onClick={() => {
                                    setWeightValue("");
                                    setNotes("");
                                }}
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </section>

                {/* CHART */}
                <section className={styles.section}>
                    <div className={styles.chartHeaderRow}>
                        <div className={styles.sectionHeader}>
                            <h2 className={global.headLeft}>Progress Chart</h2>
                            <p>Displayed in your preferred unit: {preferredUnit} · {getChartRangeLabel(chartRange)}</p>
                        </div>

                        <div className={styles.chartRangeControls}>
                            <button
                                type="button"
                                className={chartRange === "7d" ? styles.rangeButtonActive : styles.rangeButton}
                                onClick={() => setChartRange("7d")}
                            >
                                7D
                            </button>

                            <button
                                type="button"
                                className={chartRange === "30d" ? styles.rangeButtonActive : styles.rangeButton}
                                onClick={() => setChartRange("30d")}
                            >
                                30D
                            </button>

                            <button
                                type="button"
                                className={chartRange === "90d" ? styles.rangeButtonActive : styles.rangeButton}
                                onClick={() => setChartRange("90d")}
                            >
                                90D
                            </button>

                            <button
                                type="button"
                                className={chartRange === "6m" ? styles.rangeButtonActive : styles.rangeButton}
                                onClick={() => setChartRange("6m")}
                            >
                                6M
                            </button>

                            <button
                                type="button"
                                className={chartRange === "1y" ? styles.rangeButtonActive : styles.rangeButton}
                                onClick={() => setChartRange("1y")}
                            >
                                1Y
                            </button>

                            <button
                                type="button"
                                className={chartRange === "all" ? styles.rangeButtonActive : styles.rangeButton}
                                onClick={() => setChartRange("all")}
                            >
                                All
                            </button>
                        </div>
                    </div>

                    {entries.length === 0 ? (
                        <p className={styles.emptyChart}>
                            No chart data yet. Save your first weight entry to start tracking progress.
                        </p>
                    ) : chartData.length === 0 ? (
                        <p className={styles.emptyChart}>
                            No entries found for {getChartRangeLabel(chartRange).toLowerCase()}.
                        </p>
                    ) : (
                        <div className={styles.chartShell}>
                            <ResponsiveContainer width="100%" height={360}>
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="label" />
                                    <YAxis
                                        domain={["dataMin", "dataMax"]}
                                        tickFormatter={(value) =>
                                            preferredUnit === "g"
                                                ? Math.round(Number(value)).toLocaleString()
                                                : Number(value).toFixed(1)
                                        }
                                    />
                                    <Tooltip
                                        formatter={(value) => [
                                            preferredUnit === "g"
                                                ? `${Math.round(Number(value)).toLocaleString()}${preferredUnit}`
                                                : `${Number(value).toFixed(2)}${preferredUnit}`,
                                            "Weight",
                                        ]}
                                        labelFormatter={(label) => `Date: ${label}`}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="weight"
                                        strokeWidth={2}
                                        dot
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </section>

                {/* STATS */}
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={global.headLeft}>Stats</h2>
                    </div>

                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}>
                            <p className={styles.statLabel}>Current</p>
                            <p className={styles.statValue}>{formatDisplayWeight(stats.current)}</p>
                        </div>

                        <div className={styles.statCard}>
                            <p className={styles.statLabel}>Starting</p>
                            <p className={styles.statValue}>{formatDisplayWeight(stats.starting)}</p>
                        </div>

                        <div className={styles.statCard}>
                            <p className={styles.statLabel}>Total Change</p>
                            <p className={styles.statValue}>
                                {stats.totalChange === null
                                    ? "-"
                                    : `${stats.totalChange > 0 ? "+" : ""}${formatDisplayWeight(stats.totalChange)}`}
                            </p>
                        </div>

                        <div className={styles.statCard}>
                            <p className={styles.statLabel}>Entries</p>
                            <p className={styles.statValue}>{stats.entriesLogged}</p>
                        </div>
                    </div>
                </section>

                {/* HISTORY */}
                <section className={styles.section}>
                    <div className={styles.historyHeaderRow}>
                        <div>
                            <h2 className={global.headLeft}>Weight History</h2>
                            <p>
                                Showing {filteredHistoryEntries.length} of {entries.length} saved entries.
                            </p>
                        </div>

                        <div className={styles.historyHeaderActions}>
                            <div className={styles.activeSortText}>
                                {historySort === "newest" && "Newest to Oldest"}
                                {historySort === "oldest" && "Oldest to Newest"}
                                {historySort === "highest" && "Highest to Lowest"}
                                {historySort === "lowest" && "Lowest to Highest"}
                            </div>

                            <div className={styles.sortMenuWrap}>
                                <button
                                    type="button"
                                    className={styles.sortIconButton}
                                    onClick={() => setSortMenuOpen((current) => !current)}
                                    title="Sort history"
                                >
                                    <ArrowDownWideNarrow size={22} />
                                </button>

                                {sortMenuOpen && (
                                    <div className={styles.sortDropdown}>
                                        <button
                                            type="button"
                                            className={historySort === "newest" ? styles.sortOptionActive : styles.sortOption}
                                            onClick={() => {
                                                setHistorySort("newest");
                                                setHistoryPage(1);
                                                setSortMenuOpen(false);
                                            }}
                                        >
                                            Newest to Oldest
                                        </button>

                                        <button
                                            type="button"
                                            className={historySort === "oldest" ? styles.sortOptionActive : styles.sortOption}
                                            onClick={() => {
                                                setHistorySort("oldest");
                                                setHistoryPage(1);
                                                setSortMenuOpen(false);
                                            }}
                                        >
                                            Oldest to Newest
                                        </button>

                                        <button
                                            type="button"
                                            className={historySort === "highest" ? styles.sortOptionActive : styles.sortOption}
                                            onClick={() => {
                                                setHistorySort("highest");
                                                setHistoryPage(1);
                                                setSortMenuOpen(false);
                                            }}
                                        >
                                            Highest Weight to Lowest
                                        </button>

                                        <button
                                            type="button"
                                            className={historySort === "lowest" ? styles.sortOptionActive : styles.sortOption}
                                            onClick={() => {
                                                setHistorySort("lowest");
                                                setHistoryPage(1);
                                                setSortMenuOpen(false);
                                            }}
                                        >
                                            Lowest Weight to Highest
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className={styles.historyFilters}>
                        <div className={styles.filterField}>
                            <label className={global.label}>Start Date</label>
                            <input
                                type="date"
                                className={global.input}
                                value={historyStartDate}
                                onChange={(e) => {
                                    setHistoryStartDate(e.target.value);
                                    setHistoryPage(1);
                                }}
                            />
                        </div>

                        <div className={styles.filterField}>
                            <label className={global.label}>End Date</label>
                            <input
                                type="date"
                                className={global.input}
                                value={historyEndDate}
                                onChange={(e) => {
                                    setHistoryEndDate(e.target.value);
                                    setHistoryPage(1);
                                }}
                            />
                        </div>

                        <div className={styles.filterActions}>
                            <button
                                type="button"
                                className={global.linkBtn}
                                onClick={clearHistoryFilters}
                            >
                                Clear Filters
                            </button>
                        </div>
                    </div>

                    {entries.length === 0 ? (
                        <p className={global.subcentered}>No weight entries yet.</p>
                    ) : filteredHistoryEntries.length === 0 ? (
                        <p className={global.subcentered}>No entries match those filters.</p>
                    ) : (
                        <>
                            <div className={styles.historyList}>
                                {paginatedHistoryEntries.map((entry) => {
                                    const cleanDate = entry.entry_date.split("T")[0];
                                    const displayWeight = fromPounds(Number(entry.weight_lb), preferredUnit);

                                    return (
                                        <div key={entry.id} className={styles.historyItem}>
                                            <div className={styles.historyDetails}>
                                                <div>
                                                    <span className={styles.historyLabel}>Date</span>
                                                    <span className={styles.historyValue}>
                                                        {formatDate(entry.entry_date)}
                                                    </span>
                                                </div>

                                                <div>
                                                    <span className={styles.historyLabel}>Weight</span>
                                                    <span className={styles.historyValue}>
                                                        {preferredUnit === "g"
                                                            ? Math.round(displayWeight).toLocaleString()
                                                            : displayWeight.toFixed(2)}{" "}
                                                        {preferredUnit}
                                                    </span>
                                                </div>

                                                <div>
                                                    <span className={styles.historyLabel}>Notes</span>
                                                    <span className={styles.historyValue}>
                                                        {entry.notes || "-"}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className={styles.historyActions}>
                                                <button
                                                    type="button"
                                                    className={global.iconButton}
                                                    onClick={() => handleEdit(entry)}
                                                >
                                                    <Pencil size={18} />
                                                </button>

                                                <button
                                                    type="button"
                                                    className={global.iconButton}
                                                    onClick={() => openDeleteModal(entry)}
                                                    disabled={deletingDate === cleanDate}
                                                >
                                                    <Trash size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <Pagination
                                currentPage={historyPage}
                                perPage={historyPerPage}
                                totalItems={filteredHistoryEntries.length}
                                onPageChange={setHistoryPage}
                                onPerPageChange={setHistoryPerPage}
                                label="entries"
                            />
                        </>
                    )}
                </section>

                {/* DISPLAY PREFERENCE */}
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={global.headLeft}>Display Preference</h2>

                        <p className={global.body}>
                            This controls how your chart, stats, & history are displayed.
                            Entries are stil saved internally as pounds (lbs).
                        </p>
                    </div>

                    <div className={styles.preferenceRow}>
                        <label className={global.label}>Preferred Unit</label>
                        <select
                            className={global.input}
                            value={preferredUnit}
                            onChange={(e) => handlePreferredUnitChange(e.target.value as WeightUnit)}
                            disabled={savingPref}
                        >
                            {weightUnitOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </section>
            </div>

            {/* DELETE MODAL */}
            <BasicModal
                isOpen={Boolean(pendingDeleteEntry)}
                title="Delete Weight Entry?"
                cancelText="Cancel"
                confirmText={deletingDate ? "Deleting..." : "Yes, Delete"}
                onClose={closeDeleteModal}
                onConfirm={() => {
                    if (!pendingDeleteEntry) return;
                    handleDelete(pendingDeleteEntry.entry_date);
                }}
                disableConfirm={Boolean(deletingDate)}
                message={
                    pendingDeleteEntry ? (
                        <div>
                            <p>Are you sure you want to delete this weight entry?</p>

                            <div style={{ marginTop: "1rem" }}>
                                <p className={global.labelLine}>
                                    <strong>Date:</strong> {formatDate(pendingDeleteEntry.entry_date)}
                                </p>

                                <p className={global.labelLine}>
                                    <strong>Weight:</strong>{" "}
                                    {(() => {
                                        const dipslayWeight = fromPounds(Number(pendingDeleteEntry.weight_lb), preferredUnit);

                                        return preferredUnit === "g"
                                            ? `${Math.round(dipslayWeight).toLocaleString()}${preferredUnit}`
                                            : `${dipslayWeight.toFixed(2)}${preferredUnit}`;
                                    })()}
                                </p>

                                <p className={global.labelLine}>
                                    <strong>Notes:</strong> {pendingDeleteEntry.notes || "-"}
                                </p>
                            </div>
                        </div>
                    ) : null
                }
            />
        </main>
    );
}