export type TimesheetStatus = "open" | "finalized";

export type TimesheetPermission = "view" | "comment" | "approve";

export type TimesheetCreatePayload = {
    period_start: string;
    period_end: string;
    notes?: string | null;
    is_payable?: boolean;
    hourly_rate?: string | number | null;
};

export type TimesheetUpdatePayload = {
    period_start?: string;
    period_end?: string;
    status?: TimesheetStatus;
    notes?: string | null;
    is_payable?: boolean;
    hourly_rate?: string | number | null;
    is_paid?: boolean;
};

export type TimeEntryCreatePayload = {
    work_date: string;
    start_time: string;
    end_time: string;
    duration_minutes: number;
    category: string;
    description?: string | null;
};

export type TimeEntryUpdatePayload = {
    work_date?: string;
    start_time?: string;
    end_time?: string;
    duration_minutes?: number;
    category?: string;
    description?: string | null;
};

export type TimesheetShareCreatePayload = {
    user_id: string;
    permission?: TimesheetPermission;
};

export type TimesheetSummary = {
    id: string;
    user_id: string;
    period_start: string;
    period_end: string;
    status: TimesheetStatus;
    notes: string | null;
    is_payable: boolean;
    hourly_rate: string | number | null;
    is_paid: boolean;
    paid_at: string | null;
    created_at: string;
    updated_at: string;
    total_minutes: string | number;
    entry_count: string | number;
};

export type TimesheetAccess = {
    isOwner: boolean;
    isShared: boolean;
    canView: boolean;
    canEdit: boolean;
    canShare: boolean;
};

export type TimesheetDetail = TimesheetSummary & {
    user_name: string;
    user_email: string;
};

export type TimeEntry = {
    id: string;
    timesheet_id: string;
    user_id: string;
    work_date: string;
    start_time: string | null;
    end_time: string | null;
    duration_minutes: string | number;
    category: string;
    description: string | null;
    created_at: string;
    updated_at: string;
};

export type TimesheetShareRow = {
    id: string;
    timesheet_id: string;
    shared_with_user_id: string;
    shared_with_name: string | null;
    shared_with_email: string;
    shared_by_user_id: string;
    permission: TimesheetPermission;
    created_at: string;
};

export type TimesheetShareUserSearchResult = {
    id: string;
    name: string | null;
    email: string;
};

export type SharedTimesheetSummary = {
    id: string;
    user_id: string;
    owner_name: string | null;
    owner_email: string;
    period_start: string;
    period_end: string;
    status: TimesheetStatus;
    notes: string | null;
    is_payable: boolean;
    hourly_rate: string | number | null;
    is_paid: boolean;
    paid_at: string | null;
    created_at: string;
    updated_at: string;
    permission: TimesheetPermission;
    shared_at: string;
    total_minutes: string | number;
    entry_count: string | number;
};