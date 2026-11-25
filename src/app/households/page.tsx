"use client";

import ColorPicker from "@/components/ColorPicker";
import Banner from "@/components/Images/banner";
import LoadingSpinner from "@/components/LoadingSpinner";
import BasicModal from "@/components/Modals/PopupModal";
import glob from "@/styles/Global.module.css";
import mile from "@/styles/Mileage.module.css";
import { HouseholdIncomingInvitation, HouseholdWithRole } from "@/types/households";
import { LogOut, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function HouseholdsPage() {
    const router = useRouter();

    const [households, setHouseholds] = useState<HouseholdWithRole[]>([]);

    const [name, setName] = useState("");
    const [renamingHousehold, setRenamingHousehold] = useState<HouseholdWithRole | null>(null);
    const [householdName, setHouseholdName] = useState("");
    const [savingRename, setSavingRename] = useState(false);

    const [color, setColor] = useState("#808080");
    const [householdColor, setHouseholdColor] = useState("#808080");

    const [deletingHousehold, setDeletingHousehold] = useState<HouseholdWithRole | null>(null);
    const [isDeletingHousehold, setIsDeletingHousehold] = useState(false);

    const [invitations, setInvitations] = useState<HouseholdIncomingInvitation[]>([]);
    const [respondingInvite, setRespondingInvite] = useState<string | null>(null);
    const [leavingHousehold, setLeavingHousehold] = useState<HouseholdWithRole | null>(null);
    const [isLeaving, setIsLeaving] = useState(false);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [loadError, setLoadError] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function loadHouseholds() {
            try {
                const res = await fetch("/api/households");
                if (!res.ok) throw new Error("Could not load households.");

                const data = await res.json();

                if (!cancelled) {
                    setHouseholds(data.households || []);
                }
            } catch (err) {
                console.error(err);

                if (!cancelled) {
                    setLoadError(true);
                    toast.error("Could not load households.");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadHouseholds();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        async function loadInvitations() {
            try {
                const res = await fetch("/api/households/invitations");
                if (!res.ok) throw new Error("Could not load invitations.");

                const data = await res.json();
                setInvitations(data.invitations || []);
            } catch (err) {
                console.error(err);
                toast.error("Could not load invitations. Please try again later.");
            }
        }

        loadInvitations();
    }, []);

    async function handleCreateHousehold() {
        if (!name.trim() || saving) return;

        setSaving(true);

        try {
            const res = await fetch("/api/households", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: name.trim(),
                    color,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Could not create household.");

            const household = data.household as HouseholdWithRole;

            setHouseholds((current) => [...current, household].sort((a, b) => a.name.localeCompare(b.name)));
            setName("");
            setColor("#808080");
            toast.success("Household created!");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not create household.");
        } finally {
            setSaving(false);
        }
    }

    async function handleInvitationResponse(invitationId: string, action: "accept" | "decline") {
        if (respondingInvite) return;

        setRespondingInvite(invitationId);

        try {
            const res = await fetch(`/api/households/invitations/${invitationId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Could not respond to invitation.");

            setInvitations((current) => current.filter((invite) => invite.id !== invitationId));

            if (action === "accept") {
                toast.success("Household joined!");

                const householdRes = await fetch("/api/households");

                if (householdRes.ok) {
                    const householdData = await householdRes.json();
                    setHouseholds(householdData.households || []);
                } else {
                    toast.error("Refresh to view your new household.");
                }
            } else {
                toast.success("Invitation declined.");
            }
        } catch (err) {
            console.error(err);
            toast.error(err instanceof Error ? err.message : "Could not respond to invitation. Please try again later.");
        } finally {
            setRespondingInvite(null);
        }
    }

    async function handleDeleteHousehold() {
        if (!deletingHousehold || isDeletingHousehold) return;

        setIsDeletingHousehold(true);

        try {
            const res = await fetch(`/api/households/${deletingHousehold.id}`, {
                method: "DELETE",
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Could not delete household.");

            setHouseholds((current) => current.filter((household) => household.id !== deletingHousehold.id));

            setDeletingHousehold(null);
            toast.success("Household deleted.");
        } catch (err) {
            console.error(err);
            toast.error(err instanceof Error ? err.message : "Could not delete household. Please try again later.");
        } finally {
            setIsDeletingHousehold(false);
        }
    }

    async function handleRenameHousehold() {
        if (!renamingHousehold || !householdName.trim() || savingRename) return;

        setSavingRename(true);

        try {
            const res = await fetch(`/api/households/${renamingHousehold.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: householdName.trim(),
                    color: householdColor,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Could not update household.");

            setHouseholds((current) => current.map((household) => household.id === renamingHousehold.id
                ? { ...household, ...data.household }
                : household
            ).sort((a, b) => a.name.localeCompare(b.name))
            );

            setRenamingHousehold(null);
            setHouseholdName("");
            setHouseholdColor("#808080");
            toast.success("Household updated!");
        } catch (err) {
            console.error(err);
            toast.error(err instanceof Error ? err.message : "Could not update household. Please try again later.");
        } finally {
            setSavingRename(false);
        }
    }

    async function handleLeaveHousehold() {
        if (!leavingHousehold || isLeaving) return;

        setIsLeaving(true);

        try {
            const res = await fetch(`/api/households/${leavingHousehold.id}/leave`, {
                method: "POST",
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Could not leave household.");

            setHouseholds((current) => current.filter((household) => household.id !== leavingHousehold.id));

            setLeavingHousehold(null);
            toast.success("Left household successfully.");
        } catch (err) {
            console.error(err);
            toast.error(err instanceof Error ? err.message : "Could not leave household. Please try again later.");
        } finally {
            setIsLeaving(false);
        }
    }

    if (loading) return <LoadingSpinner />;

    return (
        <main className={glob.pageWrapper}>
            <Banner
                type="default"
                title="My Households"
                subtitle="Manage your households and household members."
            />

            <div className={glob.wrap}>
                {invitations.length > 0 && (
                    <section className={glob.section}>
                        <h2 className={glob.headLeft}>Invitations</h2>

                        <div className={glob.grid}>
                            {invitations.map((invite) => (
                                <div key={invite.id} className={glob.card}>
                                    <h2>{invite.household_name}</h2>

                                    <p>Invited by {invite.invited_by_name}</p>

                                    <p>Role: {invite.role === "admin" ? "Admin" : "Member"}</p>

                                    <button
                                        type="button"
                                        className={glob.buttonBrand}
                                        disabled={respondingInvite !== null}
                                        onClick={() => handleInvitationResponse(invite.id, "accept")}
                                    >
                                        Accept
                                    </button>

                                    <button
                                        type="button"
                                        className={glob.buttonSecondary}
                                        disabled={respondingInvite !== null}
                                        onClick={() => handleInvitationResponse(invite.id, "decline")}
                                    >
                                        Decline
                                    </button>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                <section className={glob.section}>
                    <h2 className={glob.headLeft}>Create Household</h2>

                    <form
                        className={glob.form}
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleCreateHousehold();
                        }}
                    >
                        <ColorPicker
                            color={color}
                            onChange={setColor}
                            label="Household Color"
                        >
                            <label className={glob.label}>Household Name</label>
                            <input
                                type="text"
                                className={glob.input}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Household name"
                                disabled={saving}
                                required
                            />
                        </ColorPicker>

                        <button
                            type="submit"
                            className={glob.buttonBrand}
                            disabled={saving || !name.trim()}
                        >
                            {saving ? "Creating..." : "Create Household"}
                        </button>
                    </form>
                </section>

                <section className={glob.section}>
                    <h2 className={glob.headLeft}>My Households</h2>

                    {loadError ? (
                        <p>Could not load your households.</p>
                    ) : households.length === 0 ? (
                        <p>You haven&apos;t joined any households yet.</p>
                    ) : (
                        <div className={mile.historyList}>
                            {households.map((household) => (
                                <div
                                    key={household.id}
                                    className={`${mile.historyItem} ${mile.entryCard}`}
                                >
                                    <div
                                        className={mile.entrySummary}
                                        role="link"
                                        tabIndex={0}
                                        onClick={() => router.push(`/households/${household.id}`)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                router.push(`/households/${household.id}`);
                                            }
                                        }}
                                    >
                                        <div className={mile.entryDate}>
                                            <span className={`${mile.historyValue} ${glob.colorName}`}>
                                                <span
                                                    className={glob.colorDot}
                                                    style={{ backgroundColor: household.color }}
                                                    aria-hidden="true"
                                                />
                                                {household.name}
                                            </span>

                                            <span className={mile.historySubValue}>
                                                {household.role.charAt(0).toUpperCase() +
                                                    household.role.slice(1)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className={mile.entryActions}>
                                        {household.role === "owner" ? (
                                            <>
                                                <button
                                                    type="button"
                                                    className={glob.iconButton}
                                                    title="Edit Household"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setRenamingHousehold(household);
                                                        setHouseholdName(household.name);
                                                        setHouseholdColor(household.color);
                                                    }}
                                                >
                                                    <Pencil size={16} />
                                                </button>

                                                <button
                                                    type="button"
                                                    className={glob.iconButton}
                                                    title="Delete Household"
                                                    aria-label="Delete Household"
                                                    onClick={() => setDeletingHousehold(household)}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                type="button"
                                                className={glob.iconButton}
                                                title="Leave Household"
                                                aria-label="Leave Household"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setLeavingHousehold(household);
                                                }}
                                            >
                                                <LogOut size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            <BasicModal
                isOpen={deletingHousehold !== null}
                title="Delete Household?"
                message={`Are you sure you want to permanently delete ${deletingHousehold?.name || "this household"}? This cannot be undone.`}
                confirmText={isDeletingHousehold ? "Deleting..." : "Delete"}
                cancelText="Cancel"
                disableConfirm={isDeletingHousehold}
                onConfirm={handleDeleteHousehold}
                onClose={() => {
                    if (!isDeletingHousehold) setDeletingHousehold(null);
                }}
            />

            <BasicModal
                isOpen={renamingHousehold !== null}
                title="Edit Household"
                message={
                    <ColorPicker
                        color={householdColor}
                        onChange={setHouseholdColor}
                        label="Household Color"
                    >
                        <label className={glob.label}>Household Name</label>
                        <input
                            type="text"
                            className={glob.input}
                            value={householdName}
                            onChange={(e) => setHouseholdName(e.target.value)}
                            disabled={savingRename}
                            placeholder="Household Name"
                            autoFocus
                        />
                    </ColorPicker>
                }
                confirmText={savingRename ? "Saving..." : "Save"}
                cancelText="Cancel"
                disableConfirm={savingRename || !householdName.trim()}
                onConfirm={handleRenameHousehold}
                onClose={() => {
                    if (!savingRename) {
                        setRenamingHousehold(null);
                        setHouseholdName("");
                        setHouseholdColor("#808080");
                    }
                }}
            />

            <BasicModal
                isOpen={leavingHousehold !== null}
                title="Leave Household"
                message={`Are you sure you want to leave ${leavingHousehold?.name || "this household"}? You will need another invitation to rejoin.`}
                confirmText={isLeaving ? "Leaving..." : "Leave"}
                cancelText="Cancel"
                disableConfirm={isLeaving}
                onConfirm={handleLeaveHousehold}
                onClose={() => {
                    if (!isLeaving) setLeavingHousehold(null);
                }}
            />

        </main>
    );
}