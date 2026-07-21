"use client";

import Banner from "@/components/Images/banner";
import LoadingSpinner from "@/components/LoadingSpinner";
import BasicModal from "@/components/Modals/PopupModal";
import global from "@/styles/Global.module.css";
import styles from "@/styles/Mileage.module.css";
import {
    TimeEntry,
    TimeEntryCreatePayload,
    TimeEntryUpdatePayload,
    TimesheetAccess,
    TimesheetDetail,
    TimesheetShareRow,
} from "@/types/timesheets";
import {
    formatDate,
    formatHoursFromMinutes,
    getDateOnly,
    getElapsedMinutesFromTime,
    getMinutesBetweenTimes,
    getTimeOnly,
    getTodayDateString,
} from "@/app/utils/formatDate";
import { Pencil, Share2, Trash } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

export default function TimesheetDetailPage() {
    const params = useParams();
    const router = useRouter();

    const timesheetId = String(params.id || "");

    const [timesheet, setTimesheet] = useState<TimesheetDetail | null>(null);
    const [entries, setEntries] = useState<TimeEntry[]>([]);
    const [access, setAccess] = useState<TimesheetAccess | null>(null);

    const [editingTimesheet, setEditingTimesheet] = useState(false);
    const [editPeriodStart, setEditPeriodStart] = useState("");
    const [editPeriodEnd, setEditPeriodEnd] = useState("");
    const [editNotes, setEditNotes] = useState("");
    const [editIsPayable, setEditIsPayable] = useState(false);
    const [editHourlyRate, setEditHourlyRate] = useState("");

    const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
    const [pendingDeleteEntry, setPendingDeleteEntry] = useState<TimeEntry | null>(null);

    const [workDate, setWorkDate] = useState(getTodayDateString());
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [category, setCategory] = useState("");
    const [description, setDescription] = useState("");

    const [liveCategory, setLiveCategory] = useState("");
    const [liveDescription, setLiveDescription] = useState("");
    const [clockSaving, setClockSaving] = useState(false);
    const [activeElapsedMinutes, setActiveElapsedMinutes] = useState(0);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState("");

    const canEdit = Boolean(access?.canEdit) && timesheet?.status === "open";
    const canEditTimesheetSettings = Boolean(access?.canEdit) && !timesheet?.is_paid;

    const calculatedMinutes = useMemo(() => {
        return getMinutesBetweenTimes(startTime, endTime);
    }, [startTime, endTime]);

    const sortedEntries = useMemo(() => {
        return [...entries].sort((a, b) => {
            const dateCompare = a.work_date.localeCompare(b.work_date);

            if (dateCompare !== 0) return dateCompare;

            return (a.start_time || "").localeCompare(b.start_time || "");
        });
    }, [entries]);

    const activeEntry = useMemo(() => {
        return entries.find((entry) => !entry.end_time) || null;
    }, [entries]);

    const stats = useMemo(() => {
        return entries.reduce(
            (totals, entry) => {
                totals.totalMinutes += entry.end_time ? Number(entry.duration_minutes ?? 0) : 0;
                totals.entries += 1;

                return totals;
            },
            {
                totalMinutes: 0,
                entries: 0,
            }
        );
    }, [entries]);

    const estimatedPay = useMemo(() => {
        if (!timesheet?.is_payable || !timesheet.hourly_rate) return 0;

        const hours = stats.totalMinutes / 60;
        return hours * Number(timesheet.hourly_rate);
    }, [stats.totalMinutes, timesheet]);

    const loadTimesheet = useCallback(async () => {
        try {
            const res = await fetch(`/api/timesheets/${timesheetId}`);

            if (!res.ok) throw new Error("Failed to load timesheet.");

            const data = await res.json();

            return {
                timesheet: data.timesheet as TimesheetDetail,
                entries: (data.entries || []) as TimeEntry[],
                shares: (data.shares || []) as TimesheetShareRow[],
                access: data.access as TimesheetAccess,
            };
        } catch (err) {
            console.error("loadTimesheet error:", err);
            toast.error("Could not load timesheet. Please try again later.");

            return null;
        }
    }, [timesheetId]);

    useEffect(() => {
        let cancelled = false;

        async function run() {
            const loaded = await loadTimesheet();

            if (cancelled || !loaded) return;

            setTimesheet(loaded.timesheet);
            setEntries(loaded.entries);
            setAccess(loaded.access);

            const periodStart = getDateOnly(loaded.timesheet.period_start);
            const periodEnd = getDateOnly(loaded.timesheet.period_end);
            const today = getTodayDateString();

            setWorkDate(today >= periodStart && today <= periodEnd ? today : periodStart);
            setLoading(false);
        }

        run();

        return () => {
            cancelled = true;
        };
    }, [loadTimesheet]);

    useEffect(() => {
        if (!activeEntry) return;

        const updateElapsed = () => {
            setActiveElapsedMinutes(
                getElapsedMinutesFromTime(activeEntry.start_time)
            );
        };

        const initialUpdate = window.setTimeout(updateElapsed, 0);
        const interval = window.setInterval(updateElapsed, 1000);

        return () => {
            window.clearTimeout(initialUpdate);
            window.clearInterval(interval);
        };
    }, [activeEntry]);

    function resetForm() {
        setEditingEntry(null);

        if (timesheet) {
            const periodStart = getDateOnly(timesheet.period_start);
            const periodEnd = getDateOnly(timesheet.period_end);
            const today = getTodayDateString();

            setWorkDate(today >= periodStart && today <= periodEnd ? today : periodStart);
        } else {
            setWorkDate(getTodayDateString());
        }

        setStartTime("");
        setEndTime("");
        setCategory("");
        setDescription("");
    }

    function startTimesheetEdit() {
        if (!timesheet) return;

        setEditPeriodStart(getDateOnly(timesheet.period_start));
        setEditPeriodEnd(getDateOnly(timesheet.period_end));
        setEditNotes(timesheet.notes || "");
        setEditIsPayable(Boolean(timesheet.is_payable));
        setEditHourlyRate(
            timesheet.hourly_rate === null || timesheet.hourly_rate === undefined
                ? ""
                : String(timesheet.hourly_rate)
        );
        setEditingTimesheet(true);
    }

    function cancelTimesheetEdit() {
        setEditingTimesheet(false);
        setEditPeriodStart("");
        setEditPeriodEnd("");
        setEditNotes("");
        setEditIsPayable(false);
        setEditHourlyRate("");
    }

    function validateTimesheetEdit() {
        if (!editPeriodStart) {
            toast.error("Please choose a period start date.");
            return false;
        }

        if (!editPeriodEnd) {
            toast.error("Please choose a period end date.");
            return false;
        }

        if (editPeriodEnd < editPeriodStart) {
            toast.error("Period end cannot be before period start.");
            return false;
        }

        const hasEntryOutsidePeriod = entries.some((entry) => {
            const entryDate = getDateOnly(entry.work_date);

            return entryDate < editPeriodStart || entryDate > editPeriodEnd;
        });

        if (hasEntryOutsidePeriod) {
            toast.error("You have time entries outside that new period.");
            return false;
        }

        if (editIsPayable) {
            const numericRate = Number(editHourlyRate);

            if (!Number.isFinite(numericRate) || numericRate <= 0) {
                toast.error("Please enter a valid hourly rate.");
                return false;
            }
        }

        return true;
    }

    async function handleTimesheetSave() {
        if (!timesheet) return;

        if (!canEditTimesheetSettings) {
            toast.error("You cannot edit this timesheet.");
            return;
        }

        if (!validateTimesheetEdit()) return;

        setSaving(true);

        try {
            const res = await fetch(`/api/timesheets/${timesheetId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    period_start: editPeriodStart,
                    period_end: editPeriodEnd,
                    notes: editNotes.trim() || null,
                    is_payable: editIsPayable,
                    hourly_rate: editIsPayable ? editHourlyRate : null,
                    is_paid: editIsPayable ? timesheet.is_paid : false,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to update timesheet.");
            }

            setTimesheet((current) => {
                if (!current) return current;

                return {
                    ...current,
                    ...data.timesheet,
                };
            });

            setEditingTimesheet(false);
            toast.success("Timesheet updated.");
        } catch (err) {
            console.error("handleTimesheetSave error:", err);
            toast.error("Could not update timesheet.");
        } finally {
            setSaving(false);
        }
    }

    function validateForm() {
        if (!timesheet) {
            toast.error("Timesheet is not loaded.");
            return false;
        }

        if (!workDate) {
            toast.error("Please choose a work date.");
            return false;
        }

        if (
            workDate < getDateOnly(timesheet.period_start) ||
            workDate > getDateOnly(timesheet.period_end)
        ) {
            toast.error("Work date must be within the timesheet period.");
            return false;
        }

        if (!startTime) {
            toast.error("Please enter a clock-in time.");
            return false;
        }

        if (!endTime) {
            toast.error("Please enter a clock-out time.");
            return false;
        }

        if (endTime <= startTime) {
            toast.error("Clock-out time must be after clock-in time.");
            return false;
        }

        if (!calculatedMinutes || calculatedMinutes <= 0) {
            toast.error("Calculated time must be greater than zero.");
            return false;
        }

        if (!category.trim()) {
            toast.error("Please enter a category.");
            return false;
        }

        return true;
    }

    function buildCreatePayload(): TimeEntryCreatePayload {
        return {
            work_date: workDate,
            start_time: startTime,
            end_time: endTime,
            duration_minutes: calculatedMinutes,
            category: category.trim(),
            description: description.trim() || null,
        };
    }

    function buildUpdatePayload(): TimeEntryUpdatePayload {
        return {
            work_date: workDate,
            start_time: startTime,
            end_time: endTime,
            duration_minutes: calculatedMinutes,
            category: category.trim(),
            description: description.trim() || null,
        };
    }

    async function handleClockIn() {
        if (!canEdit) {
            toast.error("You cannot edit this timesheet.");
            return;
        }

        if (!liveCategory.trim()) {
            toast.error("Please enter a category.");
            return;
        }

        setClockSaving(true);

        try {
            const res = await fetch(`/api/timesheets/${timesheetId}/clock`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        category: liveCategory.trim(),
                        description: liveDescription.trim() || null,
                    }),
                }
            );

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Failed to clcok in.");

            setEntries((current) => [
                ...current,
                data.entry as TimeEntry,
            ]);

            setLiveCategory("");
            setLiveDescription("");
            setActiveElapsedMinutes(0);

            toast.success("Clocked in!");
        } catch (err) {
            console.error("handleClockIn error:", err);
            toast.error(err instanceof Error ? err.message : "Could not clock in. Please try again later.");
        } finally {
            setClockSaving(false);
        }
    }

    async function handleClockOut() {
        if (!activeEntry) return;

        setClockSaving(true);

        try {
            const res = await fetch(`/api/timesheets/${timesheetId}/clock`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        entry_id: activeEntry.id,
                    }),
                }
            );

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Failed to clock out.");

            const savedEntry = data.entry as TimeEntry;

            setEntries((current) => current.map((entry) => entry.id === savedEntry.id ? savedEntry : entry));

            toast.success("Clocked out!");
        } catch (err) {
            console.error("handleClockOut error:", err);
            toast.error(err instanceof Error ? err.message : "Could not clock out. Please try again later.");
        } finally {
            setClockSaving(false);
        }
    }

    async function handleSave() {
        if (!canEdit) {
            toast.error("You cannot edit this timesheet.");
            return;
        }

        if (!validateForm()) return;

        setSaving(true);

        try {
            const res = await fetch(
                editingEntry
                    ? `/api/timesheets/${timesheetId}/entries/${editingEntry.id}`
                    : `/api/timesheets/${timesheetId}/entries`,
                {
                    method: editingEntry ? "PATCH" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(
                        editingEntry ? buildUpdatePayload() : buildCreatePayload()
                    ),
                }
            );

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to save time entry.");
            }

            const savedEntry = data.entry as TimeEntry;

            setEntries((current) => {
                if (!editingEntry) {
                    return [...current, savedEntry];
                }

                return current.map((entry) =>
                    entry.id === savedEntry.id ? savedEntry : entry
                );
            });

            toast.success(editingEntry ? "Time entry updated!" : "Time entry saved!");
            resetForm();
        } catch (err) {
            console.error("handleSave time entry error:", err);
            toast.error("Could not save time entry.");
        } finally {
            setSaving(false);
        }
    }

    function handleEdit(entry: TimeEntry) {
        setEditingEntry(entry);
        setWorkDate(getDateOnly(entry.work_date));
        setStartTime(getTimeOnly(entry.start_time));
        setEndTime(getTimeOnly(entry.end_time));
        setCategory(entry.category);
        setDescription(entry.description || "");

        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    async function handleStatusChange(nextStatus: "open" | "finalized") {
        if (!timesheet) return;

        if (nextStatus === "finalized" && activeEntry) {
            toast.error("Clock out before finalizing this timesheet.");
            return;
        }

        setSaving(true);

        try {
            const res = await fetch(`/api/timesheets/${timesheetId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status: nextStatus,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to update timesheet status.");
            }

            setTimesheet((current) => {
                if (!current) return current;

                return {
                    ...current,
                    ...data.timesheet,
                };
            });

            toast.success(
                nextStatus === "finalized"
                    ? "Timesheet finalized."
                    : "Timesheet reopened."
            );
        } catch (err) {
            console.error("handleStatusChange error:", err);
            toast.error("Could not update timesheet status.");
        } finally {
            setSaving(false);
        }
    }

    async function handlePaidChange(nextPaid: boolean) {
        if (!timesheet) return;

        setSaving(true);

        try {
            const res = await fetch(`/api/timesheets/${timesheetId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    is_paid: nextPaid,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to update payment status.");
            }

            setTimesheet((current) => {
                if (!current) return current;

                return {
                    ...current,
                    ...data.timesheet,
                };
            });

            toast.success(nextPaid ? "Timesheet marked as paid." : "Timesheet marked as unpaid.");
        } catch (err) {
            console.error("handlePaidChange error:", err);
            toast.error("Could not update payment status.");
        } finally {
            setSaving(false);
        }
    }

    function openDeleteModal(entry: TimeEntry) {
        setPendingDeleteEntry(entry);
    }

    function closeDeleteModal() {
        if (deletingId) return;

        setPendingDeleteEntry(null);
    }

    async function handleDelete(entryId: string) {
        if (!canEdit) {
            toast.error("You cannot edit this timesheet.");
            return;
        }

        setDeletingId(entryId);

        try {
            const res = await fetch(`/api/timesheets/${timesheetId}/entries/${entryId}`, {
                method: "DELETE",
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to delete time entry.");
            }

            setEntries((current) => current.filter((entry) => entry.id !== entryId));

            if (editingEntry?.id === entryId) {
                resetForm();
            }

            setPendingDeleteEntry(null);
            toast.success("Time entry deleted!");
        } catch (err) {
            console.error("handleDelete time entry error:", err);
            toast.error("Could not delete time entry.");
        } finally {
            setDeletingId("");
        }
    }

    if (loading) return <LoadingSpinner />;

    if (!timesheet) {
        return (
            <main className={global.pageWrapper}>
                <Banner
                    type="default"
                    title="Timesheet Not Found"
                    subtitle="This timesheet could not be loaded."
                />
            </main>
        );
    }

    return (
        <main className={global.pageWrapper}>
            <Banner
                type="default"
                title="Timesheet"
                subtitle={`${formatDate(timesheet.period_start)} - ${formatDate(timesheet.period_end)}`}
            />

            <div className={styles.mileagePage}>
                <section className={styles.section}>
                    <div className={styles.historyHeaderRow}>
                        <div>
                            <h2 className={global.headLeft}>Timesheet Details</h2>

                            <p>Owner: {timesheet.user_name || timesheet.user_email}</p>

                            <p>
                                Status: {timesheet.status}
                                {access?.isShared && !access.isOwner ? " • Shared with you" : ""}
                            </p>

                            <p>
                                Payable: {timesheet.is_payable ? "Yes" : "No"}
                                {timesheet.is_payable && timesheet.hourly_rate
                                    ? ` • $${Number(timesheet.hourly_rate).toFixed(2)}/hr`
                                    : ""}
                            </p>

                            {timesheet.is_payable && (
                                <p>
                                    Paid: {timesheet.is_paid ? "Yes" : "No"}
                                    {timesheet.paid_at
                                        ? ` • ${formatDate(timesheet.paid_at)}`
                                        : ""}
                                </p>
                            )}

                            {timesheet.notes && <p>Notes: {timesheet.notes}</p>}
                        </div>

                        <div className={styles.actions}>
                            {canEditTimesheetSettings && !editingTimesheet && (
                                <button
                                    type="button"
                                    className={global.buttonSecondary}
                                    onClick={startTimesheetEdit}
                                    disabled={saving}
                                >
                                    Edit Timesheet
                                </button>
                            )}

                            {access?.canEdit && timesheet.status === "open" && (
                                <button
                                    type="button"
                                    className={global.buttonBrand}
                                    onClick={() => handleStatusChange("finalized")}
                                    disabled={saving || editingTimesheet || Boolean(activeEntry)}
                                >
                                    {saving ? "Finalizing..." : "Finalize Timesheet"}
                                </button>
                            )}

                            {access?.canEdit &&
                                timesheet.status === "finalized" &&
                                !timesheet.is_paid && (
                                    <button
                                        type="button"
                                        className={global.buttonSecondary}
                                        onClick={() => handleStatusChange("open")}
                                        disabled={saving || editingTimesheet}
                                    >
                                        Reopen Timesheet
                                    </button>
                                )}

                            {access?.canEdit &&
                                timesheet.status === "finalized" &&
                                timesheet.is_payable &&
                                !timesheet.is_paid && (
                                    <button
                                        type="button"
                                        className={global.buttonBrand}
                                        onClick={() => handlePaidChange(true)}
                                        disabled={saving || editingTimesheet}
                                    >
                                        {saving ? "Marking Paid..." : "Mark as Paid"}
                                    </button>
                                )}

                            {access?.canEdit &&
                                timesheet.status === "finalized" &&
                                timesheet.is_payable &&
                                timesheet.is_paid && (
                                    <button
                                        type="button"
                                        className={global.buttonSecondary}
                                        onClick={() => handlePaidChange(false)}
                                        disabled={saving || editingTimesheet}
                                    >
                                        Mark as Unpaid
                                    </button>
                                )}

                            {access?.canShare && (
                                <button
                                    type="button"
                                    className={global.buttonBrand}
                                    onClick={() => router.push(`/timesheets/${timesheetId}/share`)}
                                    disabled={saving || editingTimesheet}
                                >
                                    <Share2 size={16} />
                                    Share
                                </button>
                            )}

                            <button
                                type="button"
                                className={global.buttonSecondary}
                                onClick={() => router.push("/timesheets")}
                                disabled={saving}
                            >
                                Back
                            </button>
                        </div>
                    </div>
                </section>

                {editingTimesheet && (
                    <section className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h2 className={global.headLeft}>Edit Timesheet</h2>
                            <p>Update notes, whether this timesheet is payable, and the hourly rate.</p>
                        </div>

                        <div className={styles.quickEntryGrid}>
                            <div className={styles.field}>
                                <label className={global.label}>Period Start</label>
                                <input
                                    type="date"
                                    className={global.input}
                                    value={editPeriodStart}
                                    onChange={(e) => setEditPeriodStart(e.target.value)}
                                    disabled={saving}
                                />
                            </div>

                            <div className={styles.field}>
                                <label className={global.label}>Period End</label>
                                <input
                                    type="date"
                                    className={global.input}
                                    value={editPeriodEnd}
                                    onChange={(e) => setEditPeriodEnd(e.target.value)}
                                    disabled={saving}
                                />
                            </div>

                            <div className={styles.field}>
                                <label className={global.label}>Payable?</label>

                                <div className={styles.methodRow}>
                                    <button
                                        type="button"
                                        className={
                                            editIsPayable
                                                ? styles.methodButtonActive
                                                : styles.methodButton
                                        }
                                        onClick={() => setEditIsPayable(true)}
                                        disabled={saving}
                                    >
                                        Yes
                                    </button>

                                    <button
                                        type="button"
                                        className={
                                            !editIsPayable
                                                ? styles.methodButtonActive
                                                : styles.methodButton
                                        }
                                        onClick={() => {
                                            setEditIsPayable(false);
                                            setEditHourlyRate("");
                                        }}
                                        disabled={saving}
                                    >
                                        No
                                    </button>
                                </div>
                            </div>

                            {editIsPayable && (
                                <div className={styles.field}>
                                    <label className={global.label}>Hourly Rate</label>
                                    <input
                                        type="number"
                                        className={global.input}
                                        step="0.01"
                                        min={0}
                                        value={editHourlyRate}
                                        onChange={(e) => setEditHourlyRate(e.target.value)}
                                        placeholder="Example: 20.00"
                                        disabled={saving}
                                    />
                                </div>
                            )}

                            <div className={`${styles.field} ${styles.fullWidth}`}>
                                <label className={global.label}>Notes</label>
                                <textarea
                                    className={global.textarea}
                                    value={editNotes}
                                    onChange={(e) => setEditNotes(e.target.value)}
                                    placeholder="optional"
                                    disabled={saving}
                                />
                            </div>
                        </div>

                        <div className={styles.actions}>
                            <button
                                type="button"
                                className={global.buttonBrand}
                                onClick={handleTimesheetSave}
                                disabled={saving}
                            >
                                {saving ? "Saving..." : "Save Timesheet"}
                            </button>

                            <button
                                type="button"
                                className={global.buttonSecondary}
                                onClick={cancelTimesheetEdit}
                                disabled={saving}
                            >
                                Cancel
                            </button>
                        </div>
                    </section>
                )}

                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={global.headLeft}>Timesheet Stats</h2>
                    </div>

                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}>
                            <p className={styles.statLabel}>Total Hours</p>
                            <p className={styles.statValue}>
                                {formatHoursFromMinutes(stats.totalMinutes)}
                            </p>
                        </div>

                        <div className={styles.statCard}>
                            <p className={styles.statLabel}>Entries</p>
                            <p className={styles.statValue}>{stats.entries}</p>
                        </div>

                        <div className={styles.statCard}>
                            <p className={styles.statLabel}>Status</p>
                            <p className={styles.statValue}>{timesheet.status}</p>
                        </div>

                        {timesheet.is_payable && (
                            <div className={styles.statCard}>
                                <p className={styles.statLabel}>Estimated Pay</p>
                                <p className={styles.statValue}>
                                    ${estimatedPay.toFixed(2)}
                                </p>
                            </div>
                        )}
                    </div>
                </section>

                {canEdit && (
                    <section className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h2 className={global.headLeft}>
                                Live Time Tracking
                            </h2>

                            <p>
                                Clock in now & clock out when you finish!
                            </p>
                        </div>

                        {activeEntry ? (
                            <>
                                <div className={global.buttonGroup}>
                                    <button
                                        type="button"
                                        className={global.buttonBrand}
                                        onClick={handleClockOut}
                                        disabled={clockSaving}
                                    >
                                        {clockSaving ? "Clocking out..." : "Clock Out"}
                                    </button>
                                </div>

                                <div className={styles.statsGrid}>
                                    <div className={styles.statCard}>
                                        <p className={styles.statLabel}>
                                            Clocked In
                                        </p>

                                        <p className={styles.statValue}>
                                            {getTimeOnly(activeEntry.start_time)}
                                        </p>
                                    </div>

                                    <div className={styles.statCard}>
                                        <p className={styles.statLabel}>
                                            Elapsed
                                        </p>

                                        <p className={styles.statValue}>
                                            {formatHoursFromMinutes(activeElapsedMinutes)}
                                        </p>
                                    </div>

                                    <div className={styles.statCard}>
                                        <p className={styles.statLabel}>
                                            Category
                                        </p>

                                        <p className={styles.statValue}>
                                            {activeEntry.category}
                                        </p>
                                    </div>
                                </div>

                                {activeEntry.description && (
                                    <div style={{ marginTop: "18px" }}>
                                        <span className={styles.historyLabel}>Description</span>
                                        <span className={styles.historySubValue}>
                                            {activeEntry.description}
                                        </span>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <div className={styles.quickEntryGrid}>
                                    <div className={styles.field}>
                                        <label className={global.label}>Category</label>

                                        <input
                                            type="text"
                                            className={global.input}
                                            value={liveCategory}
                                            onChange={(e) => setLiveCategory(e.target.value)}
                                            placeholder="Admin, project, scouting, etc."
                                            disabled={clockSaving}
                                        />
                                    </div>

                                    <div className={`${styles.field} ${styles.fullWidth}`}>
                                        <label className={global.label}>Description</label>

                                        <textarea
                                            className={global.textarea}
                                            value={liveDescription}
                                            onChange={(e) => setLiveDescription(e.target.value)}
                                            placeholder="optional"
                                            disabled={clockSaving}
                                        />
                                    </div>
                                </div>

                                <div className={styles.actions}>
                                    <button
                                        type="button"
                                        className={global.buttonBrand}
                                        onClick={handleClockIn}
                                        disabled={clockSaving}
                                    >
                                        {clockSaving ? "Clocking in..." : "Clock In"}
                                    </button>
                                </div>
                            </>
                        )}
                    </section>
                )}

                {canEdit && (
                    <section className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h2 className={global.headLeft}>
                                {editingEntry ? "Edit Time Entry" : "Add Time Entry"}
                            </h2>

                            <p>Clock in and clock out for this timesheet period.</p>
                        </div>

                        <div className={styles.quickEntryGrid}>
                            <div className={styles.field}>
                                <label className={global.label}>Work Date</label>
                                <input
                                    type="date"
                                    className={global.input}
                                    value={workDate}
                                    onChange={(e) => setWorkDate(e.target.value)}
                                />
                            </div>

                            <div className={styles.field}>
                                <label className={global.label}>Clock In</label>
                                <input
                                    type="time"
                                    className={global.input}
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                />
                            </div>

                            <div className={styles.field}>
                                <label className={global.label}>Clock Out</label>
                                <input
                                    type="time"
                                    className={global.input}
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                />
                            </div>

                            <div className={styles.field}>
                                <label className={global.label}>Calculated Hours</label>
                                <input
                                    type="text"
                                    className={global.input}
                                    value={formatHoursFromMinutes(calculatedMinutes)}
                                    readOnly
                                />
                            </div>

                            <div className={styles.field}>
                                <label className={global.label}>Category</label>
                                <input
                                    type="text"
                                    className={global.input}
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    placeholder="Admin, project, scouting, etc."
                                />
                            </div>

                            <div className={`${styles.field} ${styles.fullWidth}`}>
                                <label className={global.label}>Description</label>
                                <textarea
                                    className={global.textarea}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
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
                                {saving
                                    ? "Saving..."
                                    : editingEntry
                                        ? "Update Entry"
                                        : "Save Entry"}
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
                )}

                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={global.headLeft}>Time Entries</h2>
                    </div>

                    {entries.length === 0 ? (
                        <p className={global.subcentered}>No time entries yet.</p>
                    ) : (
                        <div className={styles.historyList}>
                            {sortedEntries.map((entry) => (
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
                                                {formatDate(entry.work_date)}
                                            </span>
                                        </div>

                                        <div>
                                            <span className={styles.historyLabel}>Time</span>
                                            <span className={styles.historyValue}>
                                                {getTimeOnly(entry.start_time)} →{" "}
                                                {entry.end_time ? getTimeOnly(entry.end_time) : "TBD"}
                                            </span>
                                        </div>

                                        <div>
                                            <span className={styles.historyLabel}>Hours</span>
                                            <span className={styles.historyValue}>
                                                {entry.end_time ? formatHoursFromMinutes(entry.duration_minutes) : formatHoursFromMinutes(activeElapsedMinutes)}
                                            </span>
                                        </div>

                                        <div>
                                            <span className={styles.historyLabel}>Category</span>
                                            <span className={styles.historyValue}>
                                                {entry.category}
                                            </span>

                                            {entry.description && (
                                                <span className={styles.historySubValue}>
                                                    {entry.description}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {canEdit && (
                                        <div className={styles.historyActions}>
                                            <button
                                                type="button"
                                                className={global.iconButton}
                                                onClick={() => handleEdit(entry)}
                                                disabled={!entry.end_time}
                                                title={entry.end_time ? "Edit time entry" : "Clock out before editing"}
                                            >
                                                <Pencil size={18} />
                                            </button>

                                            <button
                                                type="button"
                                                className={global.iconButton}
                                                onClick={() => openDeleteModal(entry)}
                                                disabled={deletingId === entry.id}
                                                title="Delete time entry"
                                            >
                                                <Trash size={18} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            <BasicModal
                isOpen={Boolean(pendingDeleteEntry)}
                title="Delete Time Entry?"
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
                            <p>Are you sure you want to delete this time entry?</p>

                            <div style={{ marginTop: "1rem" }}>
                                <p className={global.labelLine}>
                                    <strong>Date:</strong>{" "}
                                    {formatDate(pendingDeleteEntry.work_date)}
                                </p>

                                <p className={global.labelLine}>
                                    <strong>Time:</strong>{" "}
                                    {getTimeOnly(pendingDeleteEntry.start_time)} →{" "}
                                    {getTimeOnly(pendingDeleteEntry.end_time)}
                                </p>

                                <p className={global.labelLine}>
                                    <strong>Hours:</strong>{" "}
                                    {pendingDeleteEntry.end_time ? formatHoursFromMinutes(pendingDeleteEntry.duration_minutes) : "Currently clocked in"}
                                </p>

                                <p className={global.labelLine}>
                                    <strong>Category:</strong> {pendingDeleteEntry.category}
                                </p>
                            </div>
                        </div>
                    ) : null
                }
            />
        </main>
    );
}