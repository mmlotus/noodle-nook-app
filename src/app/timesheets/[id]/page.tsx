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
    TimesheetSummary,
} from "@/types/timesheets";
import {
    formatDate,
    formatHoursFromMinutes,
    getCurrentTimeString,
    getDateOnly,
    getElapsedMinutesFromTime,
    getMinutesBetweenTimes,
    getTimeOnly,
    getTodayDateString,
} from "@/app/utils/formatDate";
import { CarFront, ChevronDown, ChevronUp, Pencil, Share2, Trash } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import Pagination from "@/components/Pagination";

export default function TimesheetDetailPage() {
    const params = useParams();
    const router = useRouter();

    const timesheetEditRef = useRef<HTMLDivElement | null>(null);
    const timeclockEditRef = useRef<HTMLDivElement | null>(null);

    const timesheetId = String(params.id || "");

    const [timesheet, setTimesheet] = useState<TimesheetDetail | null>(null);
    const [entries, setEntries] = useState<TimeEntry[]>([]);
    const [access, setAccess] = useState<TimesheetAccess | null>(null);

    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(5);

    const [editingTimesheet, setEditingTimesheet] = useState(false);
    const [editPeriodStart, setEditPeriodStart] = useState("");
    const [editPeriodEnd, setEditPeriodEnd] = useState("");
    const [editNotes, setEditNotes] = useState("");
    const [editPayer, setEditPayer] = useState("");
    const [editIsPayable, setEditIsPayable] = useState(false);
    const [editHourlyRate, setEditHourlyRate] = useState("");

    const [payerSuggestions, setPayerSuggestions] = useState<string[]>([]);

    const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
    const [expandedEntryIds, setExpandedEntryIds] = useState<string[]>([]);
    const [pendingDeleteEntry, setPendingDeleteEntry] = useState<TimeEntry | null>(null);

    const [showTimesheetDetails, setShowTimesheetDetails] = useState(false);
    const [showAddEntry, setShowAddEntry] = useState(false);

    const [workDate, setWorkDate] = useState(getTodayDateString());
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [category, setCategory] = useState("");
    const [description, setDescription] = useState("");

    const [drove, setDrove] = useState(false);

    const [liveCategory, setLiveCategory] = useState("");
    const [liveDescription, setLiveDescription] = useState("");
    const [liveDrove, setLiveDrove] = useState(false);
    const [clockSaving, setClockSaving] = useState(false);
    const [activeElapsedMinutes, setActiveElapsedMinutes] = useState(0);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState("");
    const [showDeleteTimesheetModal, setShowDeleteTimesheetModal] = useState(false);
    const [deletingTimesheet, setDeletingTimesheet] = useState(false);

    const canEdit = Boolean(access?.canEdit) && timesheet?.status === "open";
    const canEditTimesheetSettings = Boolean(access?.canEdit);

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

    const paginatedEntries = useMemo(() => {
        const startIndex = (page - 1) * perPage;
        return sortedEntries.slice(startIndex, startIndex + perPage);
    }, [sortedEntries, page, perPage]);

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

    useEffect(() => {
        async function loadPayers() {
            try {
                const res = await fetch("/api/timesheets");
                if (!res.ok) return;

                const data: { timesheets: TimesheetSummary[] } = await res.json();

                const uniquePayers = [
                    ...new Set(data.timesheets
                        .map((timesheet) => timesheet.payer?.trim())
                        .filter((value): value is string => Boolean(value))
                    ),
                ].sort((a, b) => a.localeCompare(b));

                setPayerSuggestions(uniquePayers);
            } catch (err) {
                console.error("Failed to load payer suggestions:", err);
            }
        }

        void loadPayers();
    }, []);

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
        setShowAddEntry(false);

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
        setDrove(false);
    }

    function startTimesheetEdit() {
        if (!timesheet) return;

        setEditPeriodStart(getDateOnly(timesheet.period_start));
        setEditPeriodEnd(getDateOnly(timesheet.period_end));
        setEditNotes(timesheet.notes || "");
        setEditPayer(timesheet.payer || "");
        setEditIsPayable(Boolean(timesheet.is_payable));
        setEditHourlyRate(
            timesheet.hourly_rate === null || timesheet.hourly_rate === undefined
                ? ""
                : String(timesheet.hourly_rate)
        );
        setEditingTimesheet(true);

        requestAnimationFrame(() => {
            timesheetEditRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        });
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
        if (timesheet?.is_paid) return true;

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
                body: JSON.stringify(
                    timesheet.is_paid
                        ? {
                            notes: editNotes.trim() || null,
                            payer: editPayer.trim() || null,
                        }
                        : {
                            period_start: editPeriodStart,
                            period_end: editPeriodEnd,
                            notes: editNotes.trim() || null,
                            payer: editPayer.trim() || null,
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
            drove,
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
            drove,
        };
    }

    async function handleClockIn() {
        if (!canEdit) {
            toast.error("You cannot edit this timesheet.");
            return;
        }

        setClockSaving(true);

        try {
            const res = await fetch(`/api/timesheets/${timesheetId}/clock`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        work_date: getTodayDateString(),
                        start_time: getCurrentTimeString(),
                        category: liveCategory.trim(),
                        description: liveDescription.trim() || null,
                        drove: liveDrove,
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
            setLiveDrove(false);
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
                        end_time: getCurrentTimeString(),
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

    function toggleEntryExpanded(entryId: string) {
        setExpandedEntryIds((current) =>
            current.includes(entryId)
                ? current.filter((id) => id !== entryId)
                : [...current, entryId]
        );
    }

    function handleEdit(entry: TimeEntry) {
        setEditingEntry(entry);
        setShowAddEntry(true);
        setWorkDate(getDateOnly(entry.work_date));
        setStartTime(getTimeOnly(entry.start_time));
        setEndTime(getTimeOnly(entry.end_time));
        setCategory(entry.category);
        setDescription(entry.description || "");
        setDrove(Boolean(entry.drove));

        requestAnimationFrame(() => {
            timeclockEditRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        });
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

    async function handleDeleteTimesheet() {
        if (!timesheet || !access?.isOwner || timesheet.is_paid || entries.length > 0) {
            toast.error("This timesheet cannot be deleted.");
            return;
        }

        setDeletingTimesheet(true);

        try {
            const res = await fetch(`/api/timesheets/${timesheetId}`, {
                method: "DELETE",
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to delete timesheet.");

            toast.success("Timesheet deleted!");
            router.push("/timesheets");
        } catch (err) {
            console.error("handleDeleteTimesheet error:", err);
            toast.error(err instanceof Error ? err.message : "Could not delete timesheet.");
        } finally {
            setDeletingTimesheet(false);
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

            setPage((current) => Math.min(current, Math.max(1, Math.ceil((entries.length - 1) / perPage))));

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
                <div className={styles.timesheetOverview}>
                    <div className={styles.overviewItem}>
                        <span className={styles.overviewLabel}>Status</span>
                        <strong className={styles.overviewValue}>
                            {timesheet.status}
                        </strong>
                    </div>

                    <div className={styles.overviewItem}>
                        <span className={styles.overviewLabel}>Total Hours</span>
                        <strong className={styles.overviewValue}>
                            {formatHoursFromMinutes(stats.totalMinutes)}
                        </strong>
                    </div>

                    <div className={styles.overviewItem}>
                        <span className={styles.overviewLabel}>Invoice Hours</span>
                        <strong className={styles.overviewValue}>
                            {(stats.totalMinutes / 60).toFixed(4)}
                        </strong>
                    </div>

                    <div className={styles.overviewItem}>
                        <span className={styles.overviewLabel}>Estimated Pay</span>
                        <strong className={styles.overviewValue}>
                            ${estimatedPay.toFixed(2)}
                        </strong>
                    </div>
                </div>

                {canEdit && (
                    <section className={styles.section} style={{ position: "relative" }}>
                        <div className={styles.sectionHeader}>
                            <h2 className={global.headLeft}>
                                Live Time Tracking
                            </h2>

                            <p>
                                Clock in now & clock out when you finish!
                            </p>
                        </div>

                        {activeEntry?.drove && (
                            <CarFront
                                size={36}
                                strokeWidth={1.8}
                                style={{
                                    position: "absolute",
                                    top: "24px",
                                    right: "28px",
                                    color: "var(--text)",
                                }}
                            />
                        )}

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
                                            Reference
                                        </p>

                                        <p className={styles.statValue}>
                                            {activeEntry.category || "-"}
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
                                        <label className={global.label}>Reference</label>

                                        <input
                                            type="text"
                                            className={global.input}
                                            value={liveCategory}
                                            onChange={(e) => setLiveCategory(e.target.value)}
                                            placeholder="Admin, job site, scouting, etc. (optional)"
                                            disabled={clockSaving}
                                        />
                                    </div>

                                    <div className={styles.field}>
                                        <label className={styles.droveToggle}>
                                            <input
                                                type="checkbox"
                                                checked={liveDrove}
                                                onChange={(e) => setLiveDrove(e.target.checked)}
                                                disabled={clockSaving}
                                            />
                                            <CarFront size={18} />
                                            <span>Drove</span>
                                        </label>
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
                    <section ref={timeclockEditRef} className={styles.section}>
                        <button
                            type="button"
                            className={styles.collapsibleHeader}
                            onClick={() => setShowAddEntry((current) => !current)}
                        >
                            <h2 className={global.headLeft}>
                                {editingEntry ? "Edit Time Entry" : "Manual Time Entry"}
                            </h2>
                            {showAddEntry ? (
                                <ChevronUp size={22} />
                            ) : (
                                <ChevronDown size={22} />
                            )}
                        </button>

                        {showAddEntry && (
                            <>
                                <div className={styles.sectionHeader} style={{ marginTop: "20px" }}>
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
                                        <label className={global.label}>Reference</label>
                                        <input
                                            type="text"
                                            className={global.input}
                                            value={category}
                                            onChange={(e) => setCategory(e.target.value)}
                                            placeholder="Admin, job site, scouting, etc. (optional)"
                                        />
                                    </div>

                                    <div className={styles.field}>
                                        <label className={styles.droveToggle}>
                                            <input
                                                type="checkbox"
                                                checked={drove}
                                                onChange={(e) => setDrove(e.target.checked)}
                                            />
                                            <CarFront size={18} />
                                            <span>Drove</span>
                                        </label>
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
                            </>
                        )}
                    </section>
                )}

                <section className={styles.section}>
                    <button
                        type="button"
                        className={styles.collapsibleHeader}
                        onClick={() => setShowTimesheetDetails((current) => !current)}
                    >
                        <h2 className={global.headLeft}>Timesheet Details</h2>
                        {showTimesheetDetails ? (
                            <ChevronUp size={22} />
                        ) : (
                            <ChevronDown size={22} />
                        )}
                    </button>

                    {showTimesheetDetails && (
                        <div className={styles.historyHeaderRow}>
                            <div>
                                <div className={styles.timesheetDetailsGrid}>
                                    <div className={styles.timesheetDetailItem}>
                                        <span className={styles.historyLabel}>Owner</span>
                                        <span className={styles.historyValue}>
                                            {timesheet.user_name || timesheet.user_email}
                                        </span>
                                    </div>

                                    <div className={styles.timesheetDetailItem}>
                                        <span className={styles.historyLabel}>Entries</span>
                                        <span className={styles.historyValue}>
                                            {stats.entries}
                                        </span>
                                    </div>

                                    {timesheet.payer?.trim() && (
                                        <div className={styles.timesheetDetailItem}>
                                            <span className={styles.historyLabel}>Payer</span>
                                            <span className={styles.historyValue}>
                                                {timesheet.payer}
                                            </span>
                                        </div>
                                    )}

                                    <div className={styles.timesheetDetailItem}>
                                        <span className={styles.historyLabel}>Payable</span>
                                        <span className={styles.historyValue}>
                                            {timesheet.is_payable
                                                ? `Yes${timesheet.hourly_rate
                                                    ? ` • $${Number(timesheet.hourly_rate).toFixed(2)}/hr`
                                                    : ""}`
                                                : "No"
                                            }
                                        </span>
                                    </div>

                                    {timesheet.is_payable && (
                                        <div className={styles.timesheetDetailItem}>
                                            <span className={styles.historyLabel}>Paid</span>
                                            <span className={styles.historyValue}>
                                                {timesheet.is_paid ? "Yes" : "No"}
                                                {timesheet.paid_at
                                                    ? ` • ${formatDate(timesheet.paid_at)}`
                                                    : ""}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {timesheet.notes && (
                                    <div className={styles.timesheetDetailsNotes}>
                                        <span className={styles.historyLabel}>Notes</span>
                                        <p>{timesheet.notes}</p>
                                    </div>
                                )}
                            </div>

                            <div className={styles.actions}>
                                {canEditTimesheetSettings && !editingTimesheet && (
                                    <button
                                        type="button"
                                        className={global.buttonSecondary}
                                        onClick={startTimesheetEdit}
                                        disabled={saving}
                                    >
                                        {timesheet.is_paid ? "Edit Details" : "Edit Timesheet"}
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

                                {access?.isOwner && !timesheet.is_paid && entries.length === 0 && !editingTimesheet && (
                                    <button
                                        type="button"
                                        className={global.buttonSecondary}
                                        onClick={() => setShowDeleteTimesheetModal(true)}
                                        disabled={saving || deletingTimesheet}
                                    >
                                        <Trash size={12} />{" "}
                                        Delete Timesheet
                                    </button>
                                )}

                            </div>
                        </div>
                    )}
                </section>

                {editingTimesheet && (
                    <section ref={timesheetEditRef} className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h2 className={global.headLeft}>
                                {timesheet.is_paid ? "Edit Details" : "Edit Timesheet"}
                            </h2>
                            <p>
                                {timesheet.is_paid
                                    ? "Update the payer & notes for this paid timesheet."
                                    : "Update notes, whether this timesheet is payable, and the hourly rate."}
                            </p>
                        </div>

                        <div className={styles.quickEntryGrid}>
                            {!timesheet.is_paid && (
                                <>
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
                                </>
                            )}

                            <div className={styles.field}>
                                <label className={global.label}>Payer (Optional)</label>
                                <input
                                    type="text"
                                    className={global.input}
                                    value={editPayer}
                                    onChange={(e) => setEditPayer(e.target.value)}
                                    maxLength={120}
                                    placeholder="e.g. Unique Drywall, Flawless Finish Drywall, Firefly Faux"
                                    disabled={saving}
                                    list="edit-payer-suggestions"
                                />

                                <datalist id="edit-payer-suggestions">
                                    {payerSuggestions.map((sugg) => (
                                        <option key={sugg} value={sugg} />
                                    ))}
                                </datalist>
                            </div>

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
                                {saving ? "Saving..." : timesheet.is_paid ? "Save Details" : "Save Timesheet"}
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
                        <h2 className={global.headLeft}>Time Entries</h2>
                    </div>

                    <Pagination
                        currentPage={page}
                        perPage={perPage}
                        totalItems={sortedEntries.length}
                        onPageChange={setPage}
                        onPerPageChange={(value) => {
                            setPerPage(value);
                            setPage(1);
                        }}
                        label="entries"
                    />

                    {entries.length === 0 ? (
                        <p className={global.subcentered}>No time entries yet.</p>
                    ) : (
                        <>
                            <div className={styles.historyList}>
                                {paginatedEntries.map((entry) => {
                                    const isExpanded = expandedEntryIds.includes(entry.id);
                                    const hasDescription = Boolean(entry.description);

                                    return (
                                        <div
                                            key={entry.id}
                                            className={`${styles.historyItem} ${styles.entryCard} ${editingEntry?.id === entry.id
                                                ? styles.historyItemActive
                                                : ""
                                                }`}
                                        >
                                            <button
                                                type="button"
                                                className={styles.entrySummary}
                                                onClick={() => toggleEntryExpanded(entry.id)}
                                                disabled={!hasDescription}
                                                style={{ padding: 0 }}
                                            >
                                                <div style={{ padding: "18px" }}>
                                                    <div className={styles.entryDate}>
                                                        <span className={styles.historyLabel}>Date</span>
                                                        <span className={styles.historyValue}>
                                                            {formatDate(entry.work_date)}
                                                            {entry.drove && (
                                                                <CarFront
                                                                    size={16}
                                                                    style={{
                                                                        display: "inline-block",
                                                                        verticalAlign: "middle",
                                                                        marginLeft: 8,
                                                                    }}
                                                                />
                                                            )}
                                                        </span>
                                                    </div>

                                                    <div className={styles.entryMetrics}>
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
                                                                {entry.end_time
                                                                    ? formatHoursFromMinutes(entry.duration_minutes)
                                                                    : formatHoursFromMinutes(activeElapsedMinutes)}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className={styles.entryCategory}>
                                                        <span className={styles.historyLabel}>Reference</span>
                                                        <span className={styles.historyValue}>
                                                            {entry.category || "-"}
                                                        </span>
                                                    </div>
                                                </div>

                                                {hasDescription && (
                                                    <div
                                                        style={{
                                                            padding: "12px 18px 18px",
                                                            borderTop: "1px solid var(--border-light)",
                                                            background: "#f0f0f0",
                                                        }}
                                                    >
                                                        <div
                                                            className={styles.entryDescriptionControl}
                                                            style={{ marginTop: 0 }}
                                                        >
                                                            <span>
                                                                {isExpanded ? "Hide Description" : "View Description"}
                                                            </span>

                                                            {isExpanded ? (
                                                                <ChevronUp size={18} />
                                                            ) : (
                                                                <ChevronDown size={18} />
                                                            )}
                                                        </div>

                                                        {isExpanded && (
                                                            <div className={styles.entryDescription}>
                                                                {entry.description}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </button>

                                            {canEdit && (
                                                <div className={styles.entryActions}>
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
                                    );
                                })}
                            </div>

                            <Pagination
                                currentPage={page}
                                perPage={perPage}
                                totalItems={sortedEntries.length}
                                onPageChange={setPage}
                                onPerPageChange={(value) => {
                                    setPerPage(value);
                                    setPage(1);
                                }}
                                label="entries"
                            />
                        </>
                    )}
                </section>
            </div>

            <BasicModal
                isOpen={showDeleteTimesheetModal}
                title="Delete Timesheet?"
                message="Are you sure you want to permanently delete this empty timesheet? This action cannot be undone."
                cancelText="Cancel"
                confirmText={deletingTimesheet ? "Deleting..." : "Yes, Delete"}
                onClose={() => {
                    if (!deletingTimesheet) {
                        setShowDeleteTimesheetModal(false);
                    }
                }}
                onConfirm={() => {
                    void handleDeleteTimesheet();
                }}
                disableConfirm={deletingTimesheet}
            />

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
                                    <strong>Reference:</strong> {pendingDeleteEntry.category}
                                </p>
                            </div>
                        </div>
                    ) : null
                }
            />
        </main>
    );
}