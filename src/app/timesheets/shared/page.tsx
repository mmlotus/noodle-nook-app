"use client";

import Banner from "@/components/Images/banner";
import LoadingSpinner from "@/components/LoadingSpinner";
import Pagination from "@/components/Pagination";
import global from "@/styles/Global.module.css";
import styles from "@/styles/Mileage.module.css";
import { SharedTimesheetSummary } from "@/types/timesheets";
import {
    formatDate,
    formatHoursFromMinutes,
} from "@/app/utils/formatDate";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

export default function SharedTimesheetsPage() {
    const router = useRouter();

    const [timesheets, setTimesheets] = useState<SharedTimesheetSummary[]>([]);
    const [loading, setLoading] = useState(true);

    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);

    const paginatedTimesheets = useMemo(() => {
        const startIndex = (page - 1) * perPage;
        return timesheets.slice(startIndex, startIndex + perPage);
    }, [timesheets, page, perPage]);

    const stats = useMemo(() => {
        return timesheets.reduce(
            (totals, timesheet) => {
                totals.totalMinutes += Number(timesheet.total_minutes ?? 0);
                totals.timesheets += 1;
                totals.entries += Number(timesheet.entry_count ?? 0);

                return totals;
            },
            {
                totalMinutes: 0,
                timesheets: 0,
                entries: 0,
            }
        );
    }, [timesheets]);

    async function loadSharedTimesheets() {
        try {
            const res = await fetch("/api/timesheets/shared");

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to load shared timesheets.");
            }

            return data.timesheets || [];
        } catch (err) {
            console.error("loadSharedTimesheets error:", err);
            toast.error("Could not load shared timesheets.");

            return null;
        }
    }

    useEffect(() => {
        let cancelled = false;

        async function run() {
            const loadedTimesheets = await loadSharedTimesheets();

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
                title="Shared Timesheets"
                subtitle="View timesheets that other NoodleNook users have shared with you."
            />

            <div className={styles.mileagePage}>
                <section className={styles.section}>
                    <div className={styles.historyHeaderRow}>
                        <div>
                            <h2 className={global.headLeft}>Shared With Me</h2>
                            <p>
                                Showing {timesheets.length} shared{" "}
                                {timesheets.length === 1 ? "timesheet" : "timesheets"}.
                            </p>
                        </div>

                        <div className={styles.actions}>
                            <button
                                type="button"
                                className={global.buttonSecondary}
                                onClick={() => router.push("/timesheets")}
                            >
                                My Timesheets
                            </button>
                        </div>
                    </div>
                </section>

                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={global.headLeft}>Shared Stats</h2>
                    </div>

                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}>
                            <p className={styles.statLabel}>Total Hours</p>
                            <p className={styles.statValue}>
                                {formatHoursFromMinutes(stats.totalMinutes)}
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
                        <h2 className={global.headLeft}>Shared Timesheet History</h2>
                    </div>

                    {timesheets.length === 0 ? (
                        <p className={global.subcentered}>
                            No timesheets have been shared with you yet.
                        </p>
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
                                                <span className={styles.historyLabel}>Owner</span>
                                                <span className={styles.historyValue}>
                                                    {timesheet.owner_name || timesheet.owner_email}
                                                </span>
                                            </div>

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
                                                    {formatHoursFromMinutes(
                                                        timesheet.total_minutes
                                                    )}
                                                </span>
                                            </div>

                                            <div>
                                                <span className={styles.historyLabel}>Status</span>
                                                <span className={styles.historyValue}>
                                                    {timesheet.status}
                                                </span>

                                                <span className={styles.historySubValue}>
                                                    Shared: {formatDate(timesheet.shared_at)}
                                                </span>
                                            </div>
                                            
                                            <div>
                                                <span className={styles.historySubValue}>
                                                    {timesheet.is_payable
                                                        ? timesheet.is_payable
                                                            ? "Paid"
                                                            : "Not Yet Paid"
                                                        : "N/A"}
                                                </span>
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