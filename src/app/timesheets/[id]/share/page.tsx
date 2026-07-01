"use client";

import Banner from "@/components/Images/banner";
import LoadingSpinner from "@/components/LoadingSpinner";
import BasicModal from "@/components/Modals/PopupModal";
import global from "@/styles/Global.module.css";
import styles from "@/styles/Mileage.module.css";
import { TimesheetShareUserSearchResult, TimesheetShareRow } from "@/types/timesheets";
import { formatDate } from "@/app/utils/formatDate";
import { Trash } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function ShareTimesheetPage() {
    const params = useParams();
    const router = useRouter();

    const timesheetId = String(params.id || "");

    const [shares, setShares] = useState<TimesheetShareRow[]>([]);
    const [searchResults, setSearchResults] = useState<TimesheetShareUserSearchResult[]>([]);

    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const [sharingUserId, setSharingUserId] = useState("");
    const [pendingRemoveShare, setPendingRemoveShare] = useState<TimesheetShareRow | null>(null);
    const [removingUserId, setRemovingUserId] = useState("");

    const loadShares = useCallback(async () => {
        try {
            const res = await fetch(`/api/timesheets/${timesheetId}/share`);

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to load shared users.");
            }

            return data.shares || [];
        } catch (err) {
            console.error("loadShares error:", err);
            toast.error("Could not load shared users.");

            return null;
        }
    }, [timesheetId]);

    async function searchUsers(nextQuery: string) {
        const cleanQuery = nextQuery.trim();

        if (cleanQuery.length < 2) {
            setSearchResults([]);
            return;
        }

        setSearching(true);

        try {
            const res = await fetch(
                `/api/timesheets/share-users?q=${encodeURIComponent(cleanQuery)}`
            );

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to search users.");
            }

            setSearchResults(data.users || []);
        } catch (err) {
            console.error("searchUsers error:", err);
            toast.error("Could not search users.");
        } finally {
            setSearching(false);
        }
    }

    useEffect(() => {
        let cancelled = false;

        async function run() {
            const loadedShares = await loadShares();

            if (cancelled || !loadedShares) return;

            setShares(loadedShares);
            setLoading(false);
        }

        run();

        return () => {
            cancelled = true;
        };
    }, [loadShares]);

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            searchUsers(query);
        }, 300);

        return () => {
            window.clearTimeout(timeout);
        };
    }, [query]);

    async function handleShare(userId: string) {
        setSharingUserId(userId);

        try {
            const res = await fetch(`/api/timesheets/${timesheetId}/share`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: userId,
                    permission: "view",
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to share timesheet.");
            }

            const nextShares = await loadShares();

            if (nextShares) {
                setShares(nextShares);
            }

            setQuery("");
            setSearchResults([]);
            toast.success("Timesheet shared!");
        } catch (err) {
            console.error("handleShare error:", err);
            toast.error("Could not share timesheet.");
        } finally {
            setSharingUserId("");
        }
    }

    function openRemoveModal(share: TimesheetShareRow) {
        setPendingRemoveShare(share);
    }

    function closeRemoveModal() {
        if (removingUserId) return;

        setPendingRemoveShare(null);
    }

    async function handleRemoveShare(userId: string) {
        setRemovingUserId(userId);

        try {
            const res = await fetch(`/api/timesheets/${timesheetId}/share/${userId}`, {
                method: "DELETE",
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to remove shared access.");
            }

            setShares((current) =>
                current.filter((share) => share.shared_with_user_id !== userId)
            );

            setPendingRemoveShare(null);
            toast.success("Shared access removed.");
        } catch (err) {
            console.error("handleRemoveShare error:", err);
            toast.error("Could not remove shared access.");
        } finally {
            setRemovingUserId("");
        }
    }

    if (loading) return <LoadingSpinner />;

    return (
        <main className={global.pageWrapper}>
            <Banner
                type="default"
                title="Share Timesheet"
                subtitle="Share this timesheet with another NoodleNook user."
            />

            <div className={styles.mileagePage}>
                <section className={styles.section}>
                    <div className={styles.historyHeaderRow}>
                        <div>
                            <h2 className={global.headLeft}>Add Shared User</h2>
                            <p>Only existing NoodleNook users can access shared timesheets.</p>
                        </div>

                        <div className={styles.actions}>
                            <button
                                type="button"
                                className={global.buttonSecondary}
                                onClick={() => router.push(`/timesheets/${timesheetId}`)}
                            >
                                Back to Timesheet
                            </button>
                        </div>
                    </div>

                    <div className={styles.quickEntryGrid}>
                        <div className={`${styles.field} ${styles.fullWidth}`}>
                            <label className={global.label}>Search User</label>
                            <input
                                type="text"
                                className={global.input}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search by name or email"
                            />
                        </div>
                    </div>

                    {searching && <p className={global.subcentered}>Searching...</p>}

                    {query.trim().length >= 2 && searchResults.length === 0 && !searching && (
                        <p className={global.subcentered}>
                            No matching NoodleNook users found.
                        </p>
                    )}

                    {searchResults.length > 0 && (
                        <div className={styles.historyList}>
                            {searchResults.map((result) => {
                                const alreadyShared = shares.some(
                                    (share) => share.shared_with_user_id === result.id
                                );

                                return (
                                    <div key={result.id} className={styles.historyItem}>
                                        <div className={`${styles.historyDetails} ${styles.shareUserDetails}`}>
                                            <div>
                                                <span className={styles.historyLabel}>Name</span>
                                                <span className={styles.historyValue}>
                                                    {result.name || "-"}
                                                </span>
                                            </div>

                                            <div>
                                                <span className={styles.historyLabel}>Email</span>
                                                <span className={styles.historyValue}>
                                                    {result.email}
                                                </span>
                                            </div>

                                            <div>
                                                <span className={styles.historyLabel}>Status</span>
                                                <span className={styles.historyValue}>
                                                    {alreadyShared ? "Already shared" : "Available"}
                                                </span>
                                            </div>
                                        </div>

                                        <div className={styles.historyActions}>
                                            <button
                                                type="button"
                                                className={global.buttonBrand}
                                                onClick={() => handleShare(result.id)}
                                                disabled={alreadyShared || sharingUserId === result.id}
                                            >
                                                {sharingUserId === result.id ? "Sharing..." : "Share"}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={global.headLeft}>Currently Shared With</h2>
                    </div>

                    {shares.length === 0 ? (
                        <p className={global.subcentered}>
                            This timesheet has not been shared with anyone yet.
                        </p>
                    ) : (
                        <div className={styles.historyList}>
                            {shares.map((share) => (
                                <div key={share.id} className={styles.historyItem}>
                                    <div className={styles.historyDetails}>
                                        <div>
                                            <span className={styles.historyLabel}>Name</span>
                                            <span className={styles.historyValue}>
                                                {share.shared_with_name || "-"}
                                            </span>
                                        </div>

                                        <div>
                                            <span className={styles.historyLabel}>Email</span>
                                            <span className={styles.historyValue}>
                                                {share.shared_with_email}
                                            </span>
                                        </div>

                                        <div>
                                            <span className={styles.historyLabel}>Permission</span>
                                            <span className={styles.historyValue}>
                                                {share.permission}
                                            </span>
                                        </div>

                                        <div>
                                            <span className={styles.historyLabel}>Shared</span>
                                            <span className={styles.historyValue}>
                                                {formatDate(share.created_at)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className={styles.historyActions}>
                                        <button
                                            type="button"
                                            className={global.iconButton}
                                            onClick={() => openRemoveModal(share)}
                                            disabled={
                                                removingUserId === share.shared_with_user_id
                                            }
                                            title="Remove shared access"
                                        >
                                            <Trash size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            <BasicModal
                isOpen={Boolean(pendingRemoveShare)}
                title="Remove Shared Access?"
                cancelText="Cancel"
                confirmText={removingUserId ? "Removing..." : "Yes, Remove"}
                onClose={closeRemoveModal}
                onConfirm={() => {
                    if (!pendingRemoveShare) return;
                    handleRemoveShare(pendingRemoveShare.shared_with_user_id);
                }}
                disableConfirm={Boolean(removingUserId)}
                message={
                    pendingRemoveShare ? (
                        <div>
                            <p>Remove this user&apos;s access to the timesheet?</p>

                            <div style={{ marginTop: "1rem" }}>
                                <p className={global.labelLine}>
                                    <strong>Name:</strong>{" "}
                                    {pendingRemoveShare.shared_with_name || "-"}
                                </p>

                                <p className={global.labelLine}>
                                    <strong>Email:</strong>{" "}
                                    {pendingRemoveShare.shared_with_email}
                                </p>
                            </div>
                        </div>
                    ) : null
                }
            />
        </main>
    );
}