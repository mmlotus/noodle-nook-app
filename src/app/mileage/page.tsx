"use client";

import global from "@/styles/Global.module.css";
import styles from "@/styles/Mileage.module.css";
import { MileageSortOption, MileageCreatePayload, MileageEntry, MileageEntryMethod } from "@/types/mileage";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { formatDate, getTodayDateString } from "../utils/formatDate";
import LoadingSpinner from "@/components/LoadingSpinner";
import Banner from "@/components/Images/banner";
import BasicModal from "@/components/Modals/PopupModal";
import SortDropdown from "@/components/SortDropdown";
import { Pencil, Trash } from "lucide-react";
import Pagination from "@/components/Pagination";
import { formatCurrency } from "../utils/formatMisc";

const mileageSortOptions: { value: MileageSortOption; label: string }[] = [
    { value: "newest", label: "Newest to Oldest" },
    { value: "oldest", label: "Oldest to Newest" },
    { value: "highestMiles", label: "Highest Miles to Lowest" },
    { value: "lowestMiles", label: "Lowest Miles to Highest" },
    { value: "highestReimb", label: "Highest Reimbursement to Lowest" },
    { value: "lowestReimb", label: "Lowest Reimbursement to Highest" },
];

export default function MileagePage() {
    const [entries, setEntries] = useState<MileageEntry[]>([]);

    const [editingEntry, setEditingEntry] = useState<MileageEntry | null>(null);
    const [pendingDeleteEntry, setPendingDeleteEntry] = useState<MileageEntry | null>(null);

    const [startDate, setStartDate] = useState(getTodayDateString());
    const [endDate, setEndDate] = useState(getTodayDateString());
    const [entryMethod, setEntryMethod] = useState<MileageEntryMethod>("total_miles");

    const [totalMiles, setTotalMiles] = useState("");
    const [startOdometer, setStartOdometer] = useState("");
    const [endOdometer, setEndOdometer] = useState("");

    const [startLocation, setStartLocation] = useState("");
    const [endLocation, setEndLocation] = useState("");
    const [stops, setStops] = useState("");
    const [purpose, setPurpose] = useState("");
    const [notes, setNotes] = useState("");
    const [reimbursementRate, setReimbursementRate] = useState("");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState("");

    const [historyStartDate, setHistoryStartDate] = useState("");
    const [historyEndDate, setHistoryEndDate] = useState("");
    const [historyPage, setHistoryPage] = useState(1);
    const [historyPerPage, setHistoryPerPage] = useState(10);
    const [historySort, setHistorySort] = useState<MileageSortOption>("newest");

    const filteredMileage = useMemo(() => {
        return entries.filter((entry) => {
            const cleanStartDate = entry.start_date.split("T")[0];

            if (historyStartDate && cleanStartDate < historyStartDate) return false;
            if (historyEndDate && cleanStartDate > historyEndDate) return false;

            return true;
        })
            .sort((a, b) => {
                if (historySort === "newest") {
                    return b.start_date.localeCompare(a.start_date);
                } else if (historySort === "oldest") {
                    return a.start_date.localeCompare(b.start_date);
                } else if (historySort === "highestMiles") {
                    return Number(b.total_miles) - Number(a.total_miles);
                } else if (historySort === "lowestMiles") {
                    return Number(a.total_miles) - Number(b.total_miles);
                } else if (historySort === "highestReimb") {
                    return Number(b.reimbursement_total || 0) - Number(a.reimbursement_total || 0);
                } else if (historySort === "lowestReimb") {
                    return Number(a.reimbursement_total || 0) - Number(b.reimbursement_total || 0);
                }

                return 0;
            });
    }, [entries, historyStartDate, historyEndDate, historySort]);

    const pagintatedMileage = useMemo(() => {
        const startIndex = (historyPage - 1) * historyPerPage;
        return filteredMileage.slice(startIndex, startIndex + historyPerPage);
    }, [filteredMileage, historyPage, historyPerPage]);

    const stats = useMemo(() => {
        return entries.reduce((totals, entry) => {
            totals.totalMiles += Number(entry.total_miles ?? 0);
            totals.totalReimbursement += Number(entry.reimbursement_total ?? 0);
            totals.entriesLogged += 1;

            return totals;
        },
            {
                totalMiles: 0,
                totalReimbursement: 0,
                entriesLogged: 0,
            });
    }, [entries]);

    function formatMiles(value: number | string | null) {
        const numericValue = Number(value || 0);

        return `${numericValue.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })} mi`;
    }

    function formatRate(value: number | string | null) {
        if (value === null || value === "") return "-";

        return `$${Number(value).toFixed(3)}/mi`;
    }

    async function loadMileageEntries() {
        try {
            const res = await fetch("/api/mileage");

            if (!res.ok) throw new Error("Failed to load mileage entries.");

            const data = await res.json();

            return data.entries || [];
        } catch (err) {
            console.error("loadMileageEntries error:", err);
            toast.error("Could not load mileage entries. Please try again later.");

            return null;
        }
    }

    useEffect(() => {
        let cancelled = false;

        async function run() {
            const loadedEntries = await loadMileageEntries();

            if (cancelled || !loadedEntries) return;

            setEntries(loadedEntries);
            setLoading(false);
        }

        run();

        return () => {
            cancelled = true;
        };
    }, []);

    function resetForm() {
        setEditingEntry(null);
        setStartDate(getTodayDateString());
        setEndDate(getTodayDateString());
        setEntryMethod("total_miles");
        setTotalMiles("");
        setStartOdometer("");
        setEndOdometer("");
        setStartLocation("");
        setEndLocation("");
        setStops("");
        setPurpose("");
        setNotes("");
        setReimbursementRate("");
    }

    function buildPayload(): MileageCreatePayload {
        return {
            start_date: startDate,
            end_date: endDate || startDate,
            entry_method: entryMethod,
            total_miles: entryMethod === "total_miles" ? totalMiles : undefined,
            start_odometer: entryMethod === "odometer" ? startOdometer : undefined,
            end_odometer: entryMethod === "odometer" ? endOdometer : undefined,
            start_location: startLocation.trim() || null,
            end_location: endLocation.trim() || null,
            stops: stops.trim() || null,
            purpose: purpose.trim(),
            notes: notes.trim() || null,
            reimbursement_rate: reimbursementRate.trim() || null,
        };
    }

    function validateForm() {
        if (!startDate) {
            toast.error("Please choose a start date.");
            return false;
        }

        if (!endDate) {
            toast.error("Please choose an end date.");
            return false;
        }

        if (endDate < startDate) {
            toast.error("End date cannot be before start date.");
            return false;
        }

        if (!purpose.trim()) {
            toast.error("Please enter a purpose.");
            return false;
        }

        if (entryMethod === "total_miles") {
            const numericMiles = Number(totalMiles);

            if (!Number.isFinite(numericMiles) || numericMiles <= 0) {
                toast.error("Please enter valid total miles.");
                return false;
            }
        }

        if (entryMethod === "odometer") {
            const numericStart = Number(startOdometer);
            const numericEnd = Number(endOdometer);

            if (!Number.isFinite(numericStart) || numericStart < 0) {
                toast.error("Please enter a valid start odometer.");
                return false;
            }

            if (!Number.isFinite(numericEnd) || numericEnd <= numericStart) {
                toast.error("End odometer must be greater than start odometer");
                return false;
            }
        }

        if (reimbursementRate.trim()) {
            const numericRate = Number(reimbursementRate);

            if (!Number.isFinite(numericRate) || numericRate < 0) {
                toast.error("Please enter a valid reimbursement rate.");
                return false;
            }
        }

        return true;
    }

    async function handleSave() {
        if (!validateForm()) return;

        setSaving(true);

        try {
            const payload = buildPayload();

            const requestBody = editingEntry ? { ...payload, id: editingEntry.id } : payload;

            const res = await fetch("/api/mileage", {
                method: editingEntry ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to save mileage entry.");
            }

            const savedEntry = data.entry as MileageEntry;

            setEntries((current) => {
                if (!editingEntry) {
                    return [savedEntry, ...current];
                }

                return current.map((entry) => entry.id === savedEntry.id ? savedEntry : entry);
            });

            toast.success(editingEntry ? "Mileage updated!" : "Mileage saved!");
            resetForm();
        } catch (err) {
            console.error("handleSave mileage error:", err);
            toast.error("Could not save mileage entry.");
        } finally {
            setSaving(false);
        }
    }

    function handleEdit(entry: MileageEntry) {
        setEditingEntry(entry);

        setStartDate(entry.start_date.split("T")[0]);
        setEndDate(entry.end_date.split("T")[0]);
        setEntryMethod(entry.entry_method);

        setTotalMiles(entry.entry_method === "total_miles" ? String(entry.total_miles) : "");
        setStartOdometer(entry.start_odometer === null ? "" : String(entry.start_odometer));
        setEndOdometer(entry.end_odometer === null ? "" : String(entry.end_odometer));

        setStartLocation(entry.start_location || "");
        setEndLocation(entry.end_location || "");
        setStops(entry.stops || "");
        setPurpose(entry.purpose || "");
        setNotes(entry.notes || "");
        setReimbursementRate(entry.reimbursement_rate === null ? "" : String(entry.reimbursement_rate));

        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function openDeleteModal(entry: MileageEntry) {
        setPendingDeleteEntry(entry);
    }

    function closeDeleteModal() {
        if (deletingId) return;
        setPendingDeleteEntry(null);
    }

    async function handleDelete(entryId: string) {
        setDeletingId(entryId);

        try {
            const res = await fetch("/api/mileage", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: entryId }),
            });

            if (!res.ok) throw new Error("Failed to delete mileage entry.");

            setEntries((current) => current.filter((entry) => entry.id !== entryId));

            if (editingEntry?.id === entryId) {
                resetForm();
            }

            setPendingDeleteEntry(null);
            toast.success("Mileage entry deleted!");
        } catch (err) {
            console.error("handleDelete mileage error:", err);
            toast.error("Could not delete mileage entry.");
        } finally {
            setDeletingId("");
        }
    }

    function clearHistoryFilters() {
        setHistoryStartDate("");
        setHistoryEndDate("");
        setHistoryPage(1);
    }

    if (loading) return <LoadingSpinner />;

    return (
        <main className={global.pageWrapper}>
            <Banner
                type="default"
                title="Mileage Tracker"
                subtitle="Track your work or personal mileage, reimbursement estimates & travel notes!"
            />

            <div className={styles.mileagePage}>
                {/* QUICK ENTRY */}
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={global.headLeft}>
                            {editingEntry ? "Edit Mileage Entry" : "Add Mileage Entry"}
                        </h2>

                        <p>Log a trip using total miles or odometer readings.</p>
                    </div>

                    <div className={styles.quickEntryGrid}>
                        <div className={styles.field}>
                            <label className={global.label}>Start Date</label>
                            <input
                                type="date"
                                className={global.input}
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>

                        <div className={styles.field}>
                            <label className={global.label}>End Date</label>
                            <input
                                type="date"
                                className={global.input}
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                        
                        <div className={styles.field}>
                            <label className={global.label}>Entry Method</label>

                            <div className={styles.methodRow}>
                                <button
                                    type="button"
                                    className={
                                        entryMethod === "total_miles"
                                            ? styles.methodButtonActive
                                            : styles.methodButton
                                    }
                                    onClick={() => setEntryMethod("total_miles")}
                                >
                                    Total Miles
                                </button>

                                <button
                                    type="button"
                                    className={
                                        entryMethod === "odometer"
                                            ? styles.methodButtonActive
                                            : styles.methodButton
                                    }
                                    onClick={() => setEntryMethod("odometer")}
                                >
                                    Odometer
                                </button>
                            </div>
                        </div>

                        {entryMethod === "total_miles" ? (
                            <div className={styles.field}>
                                <label className={global.label}>Total Miles</label>
                                <input
                                    type="number"
                                    className={global.input}
                                    step={0.01}
                                    min={0}
                                    value={totalMiles}
                                    onChange={(e) => setTotalMiles(e.target.value)}
                                    placeholder="Enter miles"
                                />
                            </div>
                        ) : (
                            <>
                                <div className={styles.field}>
                                    <label className={global.label}>Start Odometer</label>
                                    <input
                                        type="number"
                                        className={global.input}
                                        step={0.01}
                                        min={0}
                                        value={startOdometer}
                                        onChange={(e) => setStartOdometer(e.target.value)}
                                        placeholder="Starting reading"
                                    />
                                </div>

                                <div className={styles.field}>
                                    <label className={global.label}>End Odometer</label>
                                    <input
                                        type="number"
                                        className={global.input}
                                        step={0.01}
                                        min={0}
                                        value={endOdometer}
                                        onChange={(e) => setEndOdometer(e.target.value)}
                                        placeholder="Ending reading"
                                    />
                                </div>
                            </>
                        )}

                        <div className={styles.field}>
                            <label className={global.label}>Purpose</label>
                            <input
                                type="text"
                                className={global.input}
                                value={purpose}
                                onChange={(e) => setPurpose(e.target.value)}
                                placeholder="Client meeting, supply run, etc."
                            />
                        </div>

                        <div className={styles.field}>
                            <label className={global.label}>Reimbursement Rate</label>
                            <input
                                type="number"
                                className={global.input}
                                step={0.001}
                                min={0}
                                value={reimbursementRate}
                                onChange={(e) => setReimbursementRate(e.target.value)}
                                placeholder="Auto"
                            />
                        </div>

                        <div className={styles.field}>
                            <label className={global.label}>Start Location</label>
                            <input
                                type="text"
                                className={global.input}
                                value={startLocation}
                                onChange={(e) => setStartLocation(e.target.value)}
                                placeholder="optional"
                            />
                        </div>

                        <div className={styles.field}>
                            <label className={global.label}>End Location</label>
                            <input
                                type="text"
                                className={global.input}
                                value={endLocation}
                                onChange={(e) => setEndLocation(e.target.value)}
                                placeholder="optional"
                            />
                        </div>

                        <div className={styles.field}>
                            <label className={global.label}>Stops</label>
                            <input
                                type="text"
                                className={global.input}
                                value={stops}
                                onChange={(e) => setStops(e.target.value)}
                                placeholder="optional"
                            />
                        </div>

                        <div className={`${styles.field} ${styles.fullWidth}`}>
                            <label className={global.label}>Notes</label>
                            <textarea
                                className={global.textarea}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="optional"
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
                            {saving ? "Saving..." : editingEntry ? "Update Mileage" : "Save Mileage"}
                        </button>

                        {editingEntry && (
                            <button
                                type="button"
                                className={global.buttonSecondary}
                                onClick={resetForm}
                                disabled={saving}
                            >
                                Cancel Edit
                            </button>
                        )}
                    </div>
                </section>

                {/* STATS */}
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={global.headLeft}>Mileage Stats</h2>
                    </div>

                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}>
                            <p className={styles.statLabel}>Total Miles</p>
                            <p className={styles.statValue}>{formatMiles(stats.totalMiles)}</p>
                        </div>

                        <div className={styles.statCard}>
                            <p className={styles.statLabel}>Estimated Reimbursement</p>
                            <p className={styles.statValue}>
                                {formatCurrency(stats.totalReimbursement)}
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
                            <h2 className={global.headLeft}>Mileage History</h2>
                            <p>
                                Showing {filteredMileage.length} of {entries.length} saved entries.
                            </p>
                        </div>

                        <div className={styles.historyHeaderActions}>
                            <SortDropdown
                                value={historySort}
                                options={mileageSortOptions}
                                onChange={(nextSort) => {
                                    setHistorySort(nextSort);
                                    setHistoryPage(1);
                                }}
                                title="Sort By"
                            />
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
                        <p className={global.subcentered}>No mileage entries yet.</p>
                    ) : filteredMileage.length === 0 ? (
                        <p className={global.subcentered}>No entries match those filters.</p>
                    ) : (
                        <>
                            <div className={styles.historyList}>
                                {pagintatedMileage.map((entry) => (
                                    <div
                                        key={entry.id}
                                        className={
                                            editingEntry?.id === entry.id
                                                ? `${styles.historyItem} ${styles.historyItemActive}`
                                                : styles.historyItem
                                        }
                                    >
                                        <div className={styles.historyDetails}>
                                            <div>
                                                <span className={styles.historyLabel}>Date</span>
                                                <span className={styles.historyValue}>
                                                    {formatDate(entry.start_date)}
                                                    {entry.end_date.split("T")[0] !== entry.start_date.split("T")[0]
                                                        ? ` - ${formatDate(entry.end_date)}`
                                                        : ""}
                                                </span>
                                            </div>

                                            <div>
                                                <span className={styles.historyLabel}>Miles</span>
                                                <span className={styles.historyValue}>
                                                    {formatMiles(entry.total_miles)}
                                                </span>

                                                {entry.entry_method === "odometer" && (
                                                    <span className={styles.historySubValue}>
                                                        {entry.start_odometer} → {entry.end_odometer}
                                                    </span>
                                                )}
                                            </div>

                                            <div>
                                                <span className={styles.historyLabel}>Reimbursement</span>
                                                <span className={styles.historyValue}>
                                                    {formatCurrency(entry.reimbursement_total)}
                                                </span>

                                                <span className={styles.historySubValue}>
                                                    Rate: {formatRate(entry.reimbursement_rate)}
                                                </span>
                                            </div>

                                            <div>
                                                <span className={styles.historyLabel}>Details</span>
                                                <span className={styles.historyValue}>
                                                    {entry.purpose}
                                                </span>

                                                {(entry.start_location || entry.end_location) && (
                                                    <span className={styles.historySubValue}>
                                                        {entry.start_location || "-"} → {entry.end_location || "-"}
                                                    </span>
                                                )}

                                                {entry.stops && (
                                                    <span className={styles.historySubValue}>
                                                        Stops: {entry.stops}
                                                    </span>
                                                )}

                                                {entry.notes && (
                                                    <span className={styles.historySubValue}>
                                                        Notes: {entry.notes}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className={styles.historyActions}>
                                            <button
                                                type="button"
                                                className={global.iconButton}
                                                onClick={() => handleEdit(entry)}
                                                title="Edit mileage entry"
                                            >
                                                <Pencil size={18} />
                                            </button>

                                            <button
                                                type="button"
                                                className={global.iconButton}
                                                onClick={() => openDeleteModal(entry)}
                                                disabled={deletingId === entry.id}
                                                title="Delete mileage entry"
                                            >
                                                <Trash size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <Pagination
                                currentPage={historyPage}
                                perPage={historyPerPage}
                                totalItems={filteredMileage.length}
                                onPageChange={setHistoryPage}
                                onPerPageChange={setHistoryPerPage}
                                label="entries"
                            />
                        </>
                    )}
                </section>
            </div>

            <BasicModal
                isOpen={Boolean(pendingDeleteEntry)}
                title="Delete Mileage Entry?"
                cancelText="Cancel"
                confirmText={deletingId ? "Deleting..." : "Yes, Delete"}
                onClose={closeDeleteModal}
                onConfirm={() => {
                    if (!pendingDeleteEntry) return;
                    handleDelete(pendingDeleteEntry.id);
                }}
                disableConfirm={Boolean(deletingId)}
                message={
                    pendingDeleteEntry ? (
                        <div>
                            <p>Are you sure you want to delete this mileage entry?</p>

                            <div style={{ marginTop: "1rem" }}>
                                <p className={global.labelLine}>
                                    <strong>Date:</strong> {formatDate(pendingDeleteEntry.start_date)}
                                </p>

                                <p className={global.labelLine}>
                                    <strong>Miles:</strong> {formatMiles(pendingDeleteEntry.total_miles)}
                                </p>

                                <p className={global.labelLine}>
                                    <strong>Purpose:</strong> {pendingDeleteEntry.purpose}
                                </p>
                            </div>
                        </div>
                    ) : null
                }
            />
        </main>
    );
}