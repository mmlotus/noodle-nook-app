"use client";

import { formatDate, formatHoursFromMinutes, getTimeOnly } from "@/app/utils/formatDate";
import glob from "@/styles/Global.module.css";
import styles from "@/styles/Timesheet.module.css";
import { TimeEntry, TimesheetDetail } from "@/types/timesheets";
import { useEffect } from "react";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    timesheet: TimesheetDetail;
    entries: TimeEntry[];
};

export default function TimesheetSummaryModal({
    isOpen,
    onClose,
    timesheet,
    entries,
}: Props) {
    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };

        document.addEventListener("keydown", handleEscape);
        return () => { document.removeEventListener("keydown", handleEscape) };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const sortedEntries = [...entries].sort((a, b) => {
        const dateCompare = a.work_date.localeCompare(b.work_date);
        return dateCompare || (a.start_time || "").localeCompare(b.start_time || "");
    });

    const totalMinutes = entries.reduce((total, entry) => total + (entry.end_time ? Number(entry.duration_minutes ?? 0) : 0), 0);

    return (
        <div className={glob.modalOverlay}>
            <div
                className={`${glob.modalWide} ${styles.summaryModal}`}
                role="dialog"
            >
                <div className={styles.summaryContent}>
                    <header className={styles.summaryHeader}>
                        <h2>Timesheet Summary</h2>

                        <strong>{timesheet.user_name || timesheet.user_email}</strong>

                        {timesheet.payer && (
                            <p>Payer: {timesheet.payer}</p>
                        )}

                        <p>
                            {formatDate(timesheet.period_start)} -{" "}
                            {formatDate(timesheet.period_end)}
                        </p>
                    </header>

                    <table className={styles.summaryTable}>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>In</th>
                                <th>Out</th>
                                <th>Hours</th>
                            </tr>
                        </thead>

                        <tbody>
                            {sortedEntries.map((entry) => (
                                <tr key={entry.id}>
                                    <td>{formatDate(entry.work_date)}</td>
                                    <td>{getTimeOnly(entry.start_time) || "-"}</td>
                                    <td>{getTimeOnly(entry.end_time) || "-"}</td>
                                    <td>{entry.end_time ? formatHoursFromMinutes(entry.duration_minutes) : "-"}</td>
                                </tr>
                            ))}

                            {sortedEntries.length === 0 && (
                                <tr>
                                    <td colSpan={4}>No time entries.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    <div className={styles.summaryTotal}>
                        <span>Total Hours</span>
                        <strong>{formatHoursFromMinutes(totalMinutes)}</strong>
                    </div>
                </div>

                <div className={glob.modalActions}>
                    <button
                        type="button"
                        className={glob.buttonSecondary}
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}