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

export default function TimesheetsPage() {
    const [timesheets, setTimesheets] = useState<TimesheetSummary[]>([]);
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

            <div className={styles.mileagePage}>
                <section className={styles.section}>
                    <div className={styles.historyHeaderRow}>
                        <div>
                            <h2 className={global.headLeft}>My Timesheets</h2>
                            <p>
                                Showing {timesheets.length} saved{" "}
                                {timesheets.length === 1 ? "timesheet" : "timesheets"}
                            </p>
                        </div>

                        <div className={styles.historyHeaderActions}>
                            <Link href="/timesheets/new" className={global.buttonBrand}>
                                New Timesheet
                            </Link>

                            <Link href="/timesheets/shared" className={global.buttonSecondary}>
                                Shared Timesheets
                            </Link>
                        </div>
                    </div>
                </section>

                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={global.headLeft}>Timesheet Stats</h2>
                    </div>

                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}>
                            <p className={styles.statLabel}>Total Hours</p>
                            <p className={styles.statValue}>
                                {formatHours(stats.totalMinutes)}
                            </p>
                        </div>

                        <div className={styles.statCard}>
                            <p className={styles.statLabel}>Timesheets</p>
                            <p className={styles.statValue}>{stats.timesheets}</p>
                        </div>

                        <div className={styles.statCard}>
                            <p className={styles.statLabel}>Entries</p>
                            <p className={styles.statValue}>{stats.entries}</p>
                        </div>
                    </div>
                </section>

                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={global.headLeft}>Timesheet History</h2>
                    </div>

                    {timesheets.length === 0 ? (
                        <p className={global.subcentered}>No timesheets yet.</p>
                    ) : (
                        <>
                            <div className={styles.historyList}>
                                {paginatedTimesheets.map((timesheet) => (
                                    <Link
                                        key={timesheet.id}
                                        href={`/timesheets/${timesheet.id}`}
                                        className={styles.historyItem}
                                    >
                                        <div className={styles.historyDetails}>
                                            <div>
                                                <span className={styles.historyLabel}>Period</span>
                                                <span className={styles.historyValue}>
                                                    {formatDate(timesheet.period_start)} -{" "}
                                                    {formatDate(timesheet.period_end)}
                                                </span>
                                            </div>

                                            <div>
                                                <span className={styles.historyLabel}>Hours</span>
                                                <span className={styles.historyValue}>
                                                    {formatHours(timesheet.total_minutes)}
                                                </span>
                                            </div>

                                            <div>
                                                <span className={styles.historyLabel}>Entries</span>
                                                <span className={styles.historyValue}>
                                                    {timesheet.entry_count}
                                                </span>
                                            </div>

                                            <div>
                                                <span className={styles.historyLabel}>Status</span>
                                                <span className={styles.historyValue}>
                                                    {timesheet.status}
                                                </span>

                                                {timesheet.notes && (
                                                    <span className={styles.historySubValue}>
                                                        Notes: {timesheet.notes}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                ))}
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
            </div>
        </main>
    );
}