"use client";

import Banner from "@/components/Images/banner";
import LoadingSpinner from "@/components/LoadingSpinner";
import global from "@/styles/Global.module.css";
import styles from "@/styles/Mileage.module.css";
import { TimesheetSummary } from "@/types/timesheets";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { formatDate } from "../utils/formatDate";
import Pagination from "@/components/Pagination";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function TimesheetsPage() {
    const [timesheets, setTimesheets] = useState<TimesheetSummary[]>([]);
    const [expandedNotesIds, setExpandedNotesIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);

    const paginatedTimesheets = useMemo(() => {
        const startIndex = (page - 1) * perPage;
        return timesheets.slice(startIndex, startIndex + perPage);
    }, [timesheets, page, perPage]);

    const stats = useMemo(() => {
        return timesheets.reduce((totals, timesheet) => {
            totals.totalMinutes += Number(timesheet.total_minutes ?? 0);
            totals.timesheets += 1;
            totals.entries += Number(timesheet.entry_count ?? 0);

            return totals;
        },
            {
                totalMinutes: 0,
                timesheets: 0,
                entries: 0,
            });
    }, [timesheets]);

    function toggleNotes(id: string) {
        setExpandedNotesIds((current) =>
            current.includes(id)
                ? current.filter((item) => item !== id)
                : [...current, id]
        );
    }

    function getEstimatedPay(timesheet: TimesheetSummary) {
        if (!timesheet.is_payable || !timesheet.hourly_rate) return 0;

        const totalMinutes = Number(timesheet.total_minutes || 0);
        const hourlyRate = Number(timesheet.hourly_rate || 0);

        if (!Number.isFinite(totalMinutes) || !Number.isFinite(hourlyRate)) {
            return 0;
        }

        return (totalMinutes / 60) * hourlyRate;
    }

    function formatHours(minutes: number | string | null) {
        const numericMinutes = Number(minutes || 0);
        const hours = numericMinutes / 60;

        return `${hours.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })} hrs`;
    }

    async function loadTimesheets() {
        try {
            const res = await fetch("/api/timesheets");

            if (!res.ok) throw new Error("Failed to load timesheets.");

            const data = await res.json();

            return data.timesheets || [];
        } catch (err) {
            console.error("loadTimesheets error:", err);
            toast.error("Could not load timesheets. Please try again later.");

            return null;
        }
    }

    useEffect(() => {
        let cancelled = false;

        async function run() {
            const loadedTimesheets = await loadTimesheets();

            if (cancelled || !loadedTimesheets) return;

            setTimesheets(loadedTimesheets);
            setLoading(false);
        }

        run();

        return () => {
            cancelled = true;
        };
    }, []);

    if (loading) return <LoadingSpinner />;

    return (
        <main className={global.pageWrapper}>
            <Banner
                type="default"
                title="Time Tracking"
                subtitle="Log your time & build timesheets."
            />

            <section className={styles.section}>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "8px",
                        marginBottom: "16px",
                    }}
                >
                    <h2 className={global.headLeft}>My Timesheets</h2>
                    <span>
                        {timesheets.length} saved
                    </span>
                </div>

                <div
                    className={styles.timesheetOverview}
                    style={{
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        marginBottom: "12px",
                    }}
                >
                    <div className={styles.overviewItem}>
                        <span className={styles.overviewLabel}>Total Hours</span>
                        <strong className={styles.overviewValue}>
                            {formatHours(stats.totalMinutes)}
                        </strong>
                    </div>

                    <div className={styles.overviewItem}>
                        <span className={styles.overviewLabel}>Entries</span>
                        <strong className={styles.overviewValue}>
                            {stats.entries}
                        </strong>
                    </div>
                </div>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: "8px",
                    }}
                >
                    <Link
                        href="/timesheets/new"
                        className={global.buttonBrand}
                        style={{
                            textAlign: "center",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minWidth: 0,
                        }}
                    >
                        New Timesheet
                    </Link>

                    <Link
                        href="/timesheets/shared"
                        className={global.buttonSecondary}
                        style={{
                            textAlign: "center",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minWidth: 0,
                        }}
                    >
                        Shared Timesheets
                    </Link>
                </div>

                <div
                    style={{
                        borderTop: "1px solid var(--border-light)",
                        margin: "24px 0",
                    }}
                />

                <div className={styles.sectionHeader}>
                    <h2 className={global.headLeft}>Timesheet History</h2>
                </div>

                {timesheets.length === 0 ? (
                    <p className={global.subcentered}>No timesheets yet.</p>
                ) : (
                    <>
                        <div className={styles.historyList}>
                            {paginatedTimesheets.map((timesheet) => {
                                const isExpanded = expandedNotesIds.includes(timesheet.id);

                                return (
                                    <div
                                        key={timesheet.id}
                                        className={`${styles.historyItem} ${styles.entryCard}`}
                                    >
                                        <Link
                                            href={`/timesheets/${timesheet.id}`}
                                            className={styles.entrySummary}
                                            style={{
                                                textDecoration: "none",
                                                paddingRight: "18px",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    alignItems: "flex-start",
                                                    gap: "12px",
                                                }}
                                            >
                                                <div>
                                                    <span className={styles.historyLabel}>
                                                        Period
                                                    </span>
                                                    <span className={styles.historyValue}>
                                                        {formatDate(timesheet.period_start)} –{" "}
                                                        {formatDate(timesheet.period_end)}
                                                    </span>
                                                </div>

                                                <span
                                                    style={{
                                                        background: "var(--bg)",
                                                        borderRadius: "999px",
                                                        padding: "4px 8px",
                                                        fontSize: "0.75rem",
                                                        fontWeight: 700,
                                                        textTransform: "uppercase",
                                                    }}
                                                >
                                                    {timesheet.status}
                                                </span>
                                            </div>

                                            <div className={styles.entryMetrics}>
                                                <div>
                                                    <span className={styles.historyLabel}>
                                                        Hours
                                                    </span>
                                                    <span className={styles.historyValue}>
                                                        {formatHours(timesheet.total_minutes)}
                                                    </span>
                                                </div>

                                                <div>
                                                    <span className={styles.historyLabel}>
                                                        Entries
                                                    </span>
                                                    <span className={styles.historyValue}>
                                                        {timesheet.entry_count}
                                                    </span>
                                                </div>
                                            </div>

                                            {timesheet.is_payable && (
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        justifyContent: "space-between",
                                                        alignItems: "center",
                                                        flexWrap: "wrap",
                                                        gap: "12px",
                                                        marginTop: "16px",
                                                    }}
                                                >
                                                    <div>
                                                        <span className={styles.historyLabel}>
                                                            Estimated Pay
                                                        </span>
                                                        <span className={styles.historyValue}>
                                                            ${getEstimatedPay(timesheet).toFixed(2)}
                                                        </span>
                                                        <span className={styles.historySubValue}>
                                                            ${Number(timesheet.hourly_rate || 0).toFixed(2)}/hr
                                                        </span>
                                                    </div>

                                                    <span
                                                        className={`${styles.paymentStamp} ${timesheet.is_paid
                                                            ? styles.paymentStampPaid
                                                            : styles.paymentStampUnpaid
                                                            }`}
                                                    >
                                                        {timesheet.is_paid ? "PAID" : "UNPAID"}
                                                    </span>
                                                </div>
                                            )}
                                        </Link>

                                        {timesheet.notes && (
                                            <div
                                                style={{
                                                    padding: "12px 18px 18px",
                                                    borderTop: "1px solid var(--border-light)",
                                                    background: "#f0f0f0",
                                                }}
                                            >
                                                <button
                                                    type="button"
                                                    className={styles.collapsibleHeader}
                                                    onClick={() => toggleNotes(timesheet.id)}
                                                    aria-expanded={isExpanded}
                                                >
                                                    <div
                                                        className={styles.entryDescriptionControl}
                                                        style={{ marginTop: 0, width: "100%" }}
                                                    >
                                                        <span>
                                                            {isExpanded ? "Hide Notes" : "View Notes"}
                                                        </span>
                                                        {isExpanded ? (
                                                            <ChevronUp size={18} />
                                                        ) : (
                                                            <ChevronDown size={18} />
                                                        )}
                                                    </div>
                                                </button>

                                                {isExpanded && (
                                                    <div className={styles.entryDescription}>
                                                        {timesheet.notes}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <Pagination
                            currentPage={page}
                            perPage={perPage}
                            totalItems={timesheets.length}
                            onPageChange={setPage}
                            onPerPageChange={setPerPage}
                            label="timesheets"
                        />
                    </>
                )}
            </section>
        </main>
    );
}