"use client";

import { getTodayDateString } from "@/app/utils/formatDate";
import Banner from "@/components/Images/banner";
import global from "@/styles/Global.module.css";
import styles from "@/styles/Mileage.module.css";
import { TimesheetCreatePayload } from "@/types/timesheets";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

export default function NewTimesheetPage() {
    const router = useRouter();

    const today = getTodayDateString();

    const [periodStart, setPeriodStart] = useState(today);
    const [periodEnd, setPeriodEnd] = useState(today);
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);

    const [isPayable, setIsPayable] = useState(false);
    const [hourlyRate, setHourlyRate] = useState("");

    function validateForm() {
        if (!periodStart) {
            toast.error("Please choose a start date.");
            return false;
        }

        if (!periodEnd) {
            toast.error("Please choose an end date.");
            return false;
        }

        if (periodEnd < periodStart) {
            toast.error("End date cannot be before start date.");
            return false;
        }

        if (isPayable) {
            const numericRate = Number(hourlyRate);

            if (!Number.isFinite(numericRate) || numericRate <= 0) {
                toast.error("Please enter a valid hourly rate.");
                return false;
            }
        }

        return true;
    }

    async function handleCreate() {
        if (!validateForm()) return;

        setSaving(true);

        try {
            const payload: TimesheetCreatePayload = {
                period_start: periodStart,
                period_end: periodEnd,
                notes: notes.trim() || null,
                is_payable: isPayable,
                hourly_rate: isPayable ? hourlyRate : null,
            };

            const res = await fetch("/api/timesheets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Failed to create timesheet.");

            toast.success("Timesheet created!");
            router.push(`/timesheets/${data.timesheet.id}`);
        } catch (err) {
            console.error("handleCreate timesheet error:", err);
            toast.error("Could not create timesheet.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <main className={global.pageWrapper}>
            <Banner
                type="default"
                title="New Timesheet"
                subtitle="Create a timesheet for any date range you need."
            />

            <div className={styles.mileagePage}>
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={global.headLeft}>Create Timesheet</h2>
                        <p>Choose the start & end dates for this timesheet.</p>
                    </div>

                    <div className={styles.quickEntryGrid}>
                        <div className={styles.field}>
                            <label className={global.label}>Start Date</label>
                            <input
                                type="date"
                                className={global.input}
                                value={periodStart}
                                onChange={(e) => setPeriodStart(e.target.value)}
                            />
                        </div>

                        <div className={styles.field}>
                            <label className={global.label}>End Date</label>
                            <input
                                type="date"
                                className={global.input}
                                value={periodEnd}
                                onChange={(e) => setPeriodEnd(e.target.value)}
                            />
                        </div>
                        
                        <div className={styles.field}>
                            <label className={global.label}>Payable?</label>

                            <div className={styles.methodRow}>
                                <button
                                    type="button"
                                    className={isPayable ? styles.methodButtonActive : styles.methodButton}
                                    onClick={() => setIsPayable(true)}
                                >
                                    Yes
                                </button>

                                <button
                                    type="button"
                                    className={!isPayable ? styles.methodButtonActive : styles.methodButton}
                                    onClick={() => {
                                        setIsPayable(false);
                                        setHourlyRate("");
                                    }}
                                >
                                    No
                                </button>
                            </div>
                        </div>

                        {isPayable && (
                            <div className={styles.field}>
                                <label className={global.label}>Hourly Rate</label>
                                <input
                                    type="number"
                                    className={global.input}
                                    step="0.01"
                                    min={0}
                                    value={hourlyRate}
                                    onChange={(e) => setHourlyRate(e.target.value)}
                                    placeholder="Example: 20.00"
                                />
                            </div>
                        )}

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
                            onClick={handleCreate}
                            disabled={saving}
                        >
                            {saving ? "Creating..." : "Create Timesheet"}
                        </button>

                        <button
                            type="button"
                            className={global.buttonSecondary}
                            onClick={() => router.push("/timesheets")}
                            disabled={saving}
                        >
                            Cancel
                        </button>
                    </div>
                </section>
            </div>
        </main>
    );
}