export type HouseholdRole = "owner" | "admin" | "member";

export type Household = {
    id: string;
    name: string;
    owner_user_id: string;
    created_at: string;
    updated_at: string;
};

export type HouseholdMember = {
    id: string;
    household_id: string;
    user_id: string | null;
    display_name: string;
    color: string;
    role: HouseholdRole;
    is_active: boolean;
    created_at: string;
    updated_at: string;
};

export type HouseholdWithRole = Household & {
    member_id: string;
    role: HouseholdRole;
};

export type HouseholdCreatePayload = {
    name: string;
};

export type HouseholdDetail = HouseholdWithRole & {
    members: HouseholdMember[];
};

export type HouseholdInvitationStatus = "pending" | "accepted" | "declined" | "cancelled";

export type HouseholdInvitation = {
    id: string;
    household_id: string;
    invited_user_id: string;
    invited_by_user_id: string;
    role: "admin" | "member";
    status: HouseholdInvitationStatus;
    created_at: string;
    responded_at: string | null;
};

export type HouseholdInvitationCreatePayload = {
    email: string;
    role: "admin" | "member";
};

export type HouseholdIncomingInvitation = HouseholdInvitation & {
    household_name: string;
    invited_by_name: string;
};

export type HouseholdInvitationResponsePayload = {
    action: "accept" | "decline";
};

export type HouseholdOutgoingInvitation = HouseholdInvitation & {
    invited_user_name: string;
    invited_user_email: string;
};

export type HouseholdUserSearchResult = {
    id: string;
    name: string | null;
    email: string;
};

export type HouseholdMemberUpdatePayload = {
    display_name: string;
    color: string;
    role: HouseholdRole;
};