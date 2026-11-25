"use client";

import ColorPicker from "@/components/ColorPicker";
import Banner from "@/components/Images/banner";
import LoadingSpinner from "@/components/LoadingSpinner";
import BasicModal from "@/components/Modals/PopupModal";
import glob from "@/styles/Global.module.css";
import tags from "@/styles/Tags.module.css";
import { HouseholdDetail, HouseholdInvitationCreatePayload, HouseholdMember, HouseholdMemberUpdatePayload, HouseholdOutgoingInvitation, HouseholdUserSearchResult } from "@/types/households";
import { ChevronLeft, Crown, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function HouseholdDetailPage() {
    const params = useParams();
    const householdId = String(params.id || "");

    const [household, setHousehold] = useState<HouseholdDetail | null>(null);

    const [transferringTo, setTransferringTo] = useState<HouseholdMember | null>(null);
    const [isTransferring, setIsTransferring] = useState(false);

    const [memberName, setMemberName] = useState("");
    const [memberColor, setMemberColor] = useState("#808080");
    const [savingMember, setSavingMember] = useState(false);

    const [editingMember, setEditingMember] = useState<HouseholdMember | null>(null);
    const [savingEdit, setSavingEdit] = useState(false);

    const [removingMember, setRemovingMember] = useState<HouseholdMember | null>(null);
    const [deletingMember, setDeletingMember] = useState(false);

    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState<HouseholdInvitationCreatePayload["role"]>("member");
    const [inviteSearchResults, setInviteSearchResults] = useState<HouseholdUserSearchResult[]>([]);
    const [selectedInviteUser, setSelectedInviteUser] = useState<HouseholdUserSearchResult | null>(null);

    const [sendingInvite, setSendingInvite] = useState(false);
    const [outgoingInvitations, setOutgoingInvitations] = useState<HouseholdOutgoingInvitation[]>([]);
    const [cancellingInvite, setCancellingInvite] = useState<string | null>(null);

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function loadHousehold() {
            try {
                const res = await fetch(`/api/households/${householdId}`);
                const data = await res.json();

                if (!res.ok) throw new Error(data.error || "Could not load household.");
                if (!cancelled) setHousehold(data.household);
            } catch (err) {
                console.error(err);
                if (!cancelled) toast.error("Could not load household.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadHousehold();

        return () => {
            cancelled = true;
        };
    }, [householdId]);

    useEffect(() => {
        if (household?.role !== "owner" && household?.role !== "admin") return;

        async function loadOutgoingInvitations() {
            try {
                const res = await fetch(`/api/households/${householdId}/invitations`);
                if (!res.ok) throw new Error("Could not load outgoing invitations.");

                const data = await res.json();
                setOutgoingInvitations(data.invitations || []);
            } catch (err) {
                console.error(err);
                toast.error("Could not load outgoing invitations. Please try again later.");
            }
        }

        loadOutgoingInvitations();
    }, [householdId, household?.role]);

    useEffect(() => {
        if (selectedInviteUser || inviteEmail.trim().length < 2) return;

        const controller = new AbortController();

        async function searchUsers() {
            try {
                const res = await fetch(`/api/timesheets/share-users?q=${encodeURIComponent(inviteEmail.trim())}`,
                    { signal: controller.signal }
                );

                if (!res.ok) throw new Error("Could not search users.");

                const data = await res.json();

                if (!controller.signal.aborted) setInviteSearchResults(data.users || []);
            } catch (err) {
                if (!controller.signal.aborted) {
                    console.error(err);
                    setInviteSearchResults([]);
                }
            }
        }

        searchUsers();

        return () => controller.abort();
    }, [inviteEmail, selectedInviteUser]);

    async function handleAddMember() {
        if (!memberName.trim() || savingMember) return;

        setSavingMember(true);

        try {
            const res = await fetch(`/api/households/${householdId}/members`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    display_name: memberName.trim(),
                    color: memberColor,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Could not add member.");

            setHousehold((current) => current ? {
                ...current,
                members: [...current.members, data.member],
            } : current);

            setMemberName("");
            setMemberColor("#808080");
            toast.success("Member added!");
        } catch (err) {
            console.error(err);
            toast.error(err instanceof Error ? err.message : "Could not add member.");
        } finally {
            setSavingMember(false);
        }
    }

    async function handleInviteMember() {
        if (!inviteEmail.trim() || sendingInvite) return;

        setSendingInvite(true);

        try {
            const res = await fetch(`/api/households/${householdId}/invitations`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: inviteEmail.trim(),
                    role: inviteRole,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Could not send invitation.");

            const inviteRes = await fetch(`/api/households/${householdId}/invitations`);
            if (inviteRes.ok) {
                const inviteData = await inviteRes.json();
                setOutgoingInvitations(inviteData.invitations || []);
            }

            setInviteEmail("");
            setSelectedInviteUser(null);
            setInviteSearchResults([]);
            setInviteRole("member");
            toast.success("Invitation sent!");
        } catch (err) {
            console.error(err);
            toast.error(err instanceof Error ? err.message : "Could not send invitation. Please try again later.");
        } finally {
            setSendingInvite(false);
        }
    }

    async function handleCancelInvitation(invitationId: string) {
        if (cancellingInvite) return;

        setCancellingInvite(invitationId);

        try {
            const res = await fetch(`/api/households/invitations/${invitationId}`, {
                method: "DELETE",
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Could not cancel invitation.");

            setOutgoingInvitations((current) => current.filter((invite) => invite.id !== invitationId));

            toast.success("Invitation cancelled.");
        } catch (err) {
            console.error(err);
            toast.error(err instanceof Error ? err.message : "Could not cancel invitation. Please try again later.");
        } finally {
            setCancellingInvite(null);
        }
    }

    function canEditMember(member: HouseholdMember) {
        if (!household) return false;

        return (
            household.role === "owner" ||
            household.member_id === member.id ||
            (household.role === "admin" && member.role === "member")
        );
    }

    async function handleEditMember() {
        if (!editingMember || !editingMember.display_name.trim() || savingEdit) return;

        setSavingEdit(true);

        try {
            const payload: HouseholdMemberUpdatePayload = {
                display_name: editingMember.display_name.trim(),
                color: editingMember.color,
                role: editingMember.role,
            };

            const res = await fetch(`/api/households/${householdId}/members/${editingMember.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Could not update member.");

            setHousehold((current) => current ? {
                ...current,
                members: current.members.map((member) => member.id === data.member.id ? data.member : member),
            } : current);

            setEditingMember(null);
            toast.success("Member updated!");
        } catch (err) {
            console.error(err);
            toast.error(err instanceof Error ? err.message : "Could not update member.");
        } finally {
            setSavingEdit(false);
        }
    }

    function canRemoveMember(member: HouseholdMember) {
        if (!household || member.role === "owner" || member.id === household.member_id) return false;

        return (
            household.role === "owner" ||
            (household.role === "admin" && member.role === "member")
        );
    }

    async function handleRemoveMember() {
        if (!removingMember || deletingMember) return;

        setDeletingMember(true);

        try {
            const res = await fetch(`/api/households/${householdId}/members/${removingMember.id}`, {
                method: "DELETE",
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Could not remove member.");

            setHousehold((current) => current ? {
                ...current,
                members: current.members.filter((member) => member.id !== removingMember.id),
            } : current);

            setRemovingMember(null);
            toast.success("Member removed.");
        } catch (err) {
            console.error(err);
            toast.error(err instanceof Error ? err.message : "Could not remove member. Please try again later.");
        } finally {
            setDeletingMember(false);
        }
    }

    function canTransferTo(member: HouseholdMember) {
        return (
            household?.role === "owner" &&
            member.role !== "owner" &&
            member.user_id !== null &&
            member.is_active
        );
    }

    async function handleTransferOwnership() {
        if (!transferringTo || isTransferring) return;

        setIsTransferring(true);

        try {
            const res = await fetch(`/api/households/${householdId}/transfer`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    member_id: transferringTo.id,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Could not transfer ownership.");

            setHousehold((current) => current ? {
                ...current,
                ...data.household,
                role: "admin",
                members: current.members.map((member) => {
                    if (member.id === transferringTo.id) return { ...member, role: "owner" };
                    if (member.id === current.member_id) return { ...member, role: "admin" };
                    return member;
                }),
            } : current);

            setTransferringTo(null);
            toast.success("Ownership transferred!");
        } catch (err) {
            console.error(err);
            toast.error(err instanceof Error ? err.message : "Could not transfer ownership. Please try again later.");
        } finally {
            setIsTransferring(false);
        }
    }

    if (loading) return <LoadingSpinner />;

    if (!household) {
        return (
            <main className={glob.pageWrapper}>
                <div className={glob.wrap}>
                    <p>Household not found or unavailable. Please try again later.</p>
                    <Link href={"/households"} className={glob.link}>
                        Return to My Households
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main className={glob.pageWrapper}>
            <Banner
                type="default"
                title={household.name}
                subtitle="Manage your household, members, and tasks."
            />

            <div className={glob.wrap}>
                <Link href="/households" className={glob.link}>
                    <ChevronLeft size={10} /> My Households
                </Link>

                <section className={glob.section}>
                    <h2 className={glob.headLeft}>Household Members</h2>

                    <div className={glob.list}>
                        {household.members.map((member) => (
                            <div key={member.id} className={glob.item}>
                                <div className={glob.itemHeader}>
                                    <span className={glob.colorName}>
                                        <span
                                            className={glob.colorDot}
                                            style={{ backgroundColor: member.color }}
                                        />
                                        {member.display_name}
                                    </span>

                                    <div>
                                        {canTransferTo(member) && (
                                            <button
                                                type="button"
                                                className={glob.iconButton}
                                                title="Trasnfer Ownership"
                                                onClick={() => setTransferringTo(member)}
                                            >
                                                <Crown size={16} />
                                            </button>
                                        )}

                                        {canEditMember(member) && (
                                            <button
                                                type="button"
                                                className={glob.iconButton}
                                                title="Edit Member"
                                                onClick={() => setEditingMember({ ...member })}
                                            >
                                                <Pencil size={16} />
                                            </button>
                                        )}

                                        {canRemoveMember(member) && (
                                            <button
                                                type="button"
                                                className={glob.iconButton}
                                                title="Remove Member"
                                                onClick={() => setRemovingMember(member)}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <p className={glob.date}>
                                    {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                                    {" · "}
                                    {member.user_id ? "Linked Account" : "Household Profile"}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                {(household.role === "owner" || household.role === "admin") && (
                    <>
                        <section className={glob.section}>
                            <h2 className={glob.headLeft}>Add Household Profile</h2>

                            <form
                                className={glob.form}
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleAddMember();
                                }}
                            >
                                <ColorPicker
                                    color={memberColor}
                                    onChange={setMemberColor}
                                >
                                    <label className={glob.label}>Display Name</label>
                                    <input
                                        type="text"
                                        className={glob.input}
                                        value={memberName}
                                        onChange={(e) => setMemberName(e.target.value)}
                                        required
                                    />
                                </ColorPicker>

                                <button
                                    type="submit"
                                    className={glob.buttonBrand}
                                    disabled={savingMember || !memberName.trim()}
                                >
                                    {savingMember ? "Adding..." : "Add Profile"}
                                </button>
                            </form>
                        </section>

                        <section className={glob.section}>
                            <h2 className={glob.headLeft}>Invite Household Member</h2>

                            <form
                                className={glob.form}
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleInviteMember();
                                }}
                            >
                                <label className={glob.label}>Search User</label>
                                <input
                                    type="text"
                                    className={glob.input}
                                    value={inviteEmail}
                                    onChange={(e) => {
                                        setInviteEmail(e.target.value);
                                        setSelectedInviteUser(null);
                                        setInviteSearchResults([]);
                                    }}
                                    placeholder="Search by name or email"
                                    autoComplete="off"
                                    required
                                />

                                {!selectedInviteUser && inviteSearchResults.length > 0 && (
                                    <div className={tags.suggestions}>
                                        {inviteSearchResults
                                            .filter((result) =>
                                                !household.members.some((member) => member.user_id === result.id) &&
                                                !outgoingInvitations.some((invite) => invite.invited_user_id === result.id)
                                            )
                                            .map((result) => (
                                                <button
                                                    key={result.id}
                                                    type="button"
                                                    className={tags.suggestionButton}
                                                    onClick={() => {
                                                        setSelectedInviteUser(result);
                                                        setInviteEmail(result.email);
                                                        setInviteSearchResults([]);
                                                    }}
                                                >
                                                    {result.name} - {result.email}
                                                </button>
                                            ))}
                                    </div>
                                )}

                                <select
                                    className={glob.input}
                                    value={inviteRole}
                                    onChange={(e) => setInviteRole(e.target.value as HouseholdInvitationCreatePayload["role"])}
                                >
                                    <option value="member">Member</option>
                                    <option value="admin">Admin</option>
                                </select>

                                <button
                                    type="submit"
                                    className={glob.buttonBrand}
                                    disabled={sendingInvite || !inviteEmail.trim()}
                                >
                                    {sendingInvite ? "Sending..." : "Send Invitation"}
                                </button>
                            </form>
                        </section>
                    </>
                )}

                {(household.role === "owner" || household.role === "admin") && outgoingInvitations.length > 0 && (
                    <section className={glob.section}>
                        <h2 className={glob.headLeft}>Pending Invitations</h2>

                        <div className={glob.list}>
                            {outgoingInvitations.map((invite) => (
                                <div key={invite.id} className={glob.item}>
                                    <div className={glob.itemHeader}>
                                        <span>{invite.invited_user_name}</span>

                                        <button
                                            type="button"
                                            className={glob.iconButton}
                                            title="Cancel Invitation"
                                            disabled={cancellingInvite !== null}
                                            onClick={() => handleCancelInvitation(invite.id)}
                                        >
                                            Cancel
                                        </button>
                                    </div>

                                    <p className={glob.date}>
                                        {invite.invited_user_email}
                                    </p>

                                    <p className={glob.date}>
                                        {invite.role === "admin" ? "Admin" : "Member"}
                                        {" · "}
                                        Pending
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>

            {editingMember && (
                <BasicModal
                    isOpen={editingMember !== null}
                    title="Edit Household Member"
                    message={
                        <div className={glob.form}>
                            <ColorPicker
                                color={editingMember.color}
                                onChange={(color) =>
                                    setEditingMember({
                                        ...editingMember,
                                        color,
                                    })
                                }
                            >
                                <label className={glob.label}>Display Name</label>
                                <input
                                    type="text"
                                    className={glob.input}
                                    value={editingMember.display_name}
                                    onChange={(e) =>
                                        setEditingMember({
                                            ...editingMember,
                                            display_name: e.target.value,
                                        })
                                    }
                                    disabled={savingEdit}
                                />
                            </ColorPicker>

                            {household.role === "owner" &&
                                editingMember.role !== "owner" &&
                                editingMember.user_id && (
                                    <>
                                        <label className={glob.label}>Household Role</label>

                                        <select
                                            className={glob.input}
                                            value={editingMember.role}
                                            onChange={(e) => setEditingMember({
                                                ...editingMember,
                                                role: e.target.value as "admin" | "member",
                                            })}
                                            disabled={savingEdit}
                                        >
                                            <option value="member">Member</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </>
                                )}
                        </div>
                    }
                    confirmText={savingEdit ? "Saving..." : "Save"}
                    cancelText="Cancel"
                    disableConfirm={savingEdit || !editingMember.display_name.trim()}
                    onConfirm={handleEditMember}
                    onClose={() => {
                        if (!savingEdit) setEditingMember(null);
                    }}
                />
            )}

            <BasicModal
                isOpen={removingMember !== null}
                title="Remove Household Member?"
                message={`Are you sure you want to remove ${removingMember?.display_name || "this member"} from the household?`}
                confirmText={deletingMember ? "Removing..." : "Remove"}
                cancelText="Cancel"
                disableConfirm={deletingMember}
                onConfirm={handleRemoveMember}
                onClose={() => {
                    if (!deletingMember) setRemovingMember(null);
                }}
            />

            <BasicModal
                isOpen={transferringTo !== null}
                title="Transfer Ownership?"
                message={`Are you sure you want to transfer ownership of ${household.name} to ${transferringTo?.display_name}? You will become an admin and only the new owner can transfer ownership again.`}
                confirmText={isTransferring ? "Transferring..." : "Transfer"}
                cancelText="Cancel"
                disableConfirm={isTransferring}
                onConfirm={handleTransferOwnership}
                onClose={() => {
                    if (!isTransferring) setTransferringTo(null);
                }}
            />

        </main>
    );
}