/* BASELINE */
export type MileageEntryMethod = "total_miles" | "odometer";

export type MileageNumberInput = number | string;

export type MileageSplitMethod = "none" | "single_llc" | "auto_even";

export const MILEAGE_LLCS = [
    "Cinder Grey",
    "Red Brick",
    "The Vaper Outlet",
    "Vape Strong",
    "Vape Zone",
    "Vapor",

    "Lotus",
    "Mr. Juice",
    "Vanguard",
] as const;

export type MileageLlc = (typeof MILEAGE_LLCS)[number];

export type MileageLlcSplit = {
    llc: string;
    miles: number;
    reimbursement_total: number | null;
};


/* MILEAGE ENTRIES */
export type MileageEntry = {
    id: string;
    user_email: string;
    org: string | null;

    start_date: string;
    end_date: string;

    entry_method: MileageEntryMethod;

    total_miles: number;
    start_odometer: number | null;
    end_odometer: number | null;

    start_location: string | null;
    end_location: string | null;
    stops: string | null;

    purpose: string;
    notes: string | null;

    gas_paid_by_company: boolean;

    reimbursement_rate: number | null;
    reimbursement_total: number | null;

    split_method: MileageSplitMethod;
    llc_splits: MileageLlcSplit[];
    store_ids: string | null;

    already_submitted: number;
    submitted_mileage_log_id: string | null;

    created_at: string;
    updated_at: string;
};

export type MileageCreatePayload = Omit<
    MileageEntry,
    | "id"
    | "user_email"
    | "total_miles"
    | "start_odometer"
    | "end_odometer"
    | "reimbursement_rate"
    | "reimbursement_total"
    | "split_method"
    | "llc_splits"
    | "already_submitted"
    | "submitted_mileage_log_id"
    | "created_at"
    | "updated_at"
> & {
    total_miles?: MileageNumberInput;
    start_odometer?: MileageNumberInput;
    end_odometer?: MileageNumberInput;
    reimbursement_rate?: MileageNumberInput;

    mileage_llcs?: MileageLlc[];
    store_ids?: string | null;
};

export type MileageUpdatePayload = MileageCreatePayload & Pick<MileageEntry, "id">;

export type ValidatedMileagePayload = {
    startDate: string;
    endDate: string;
    purpose: string;
    org: string | null;
    startLocation: string | null;
    endLocation: string | null;
    stops: string | null;
    notes: string | null;
    mileageLlcs: MileageLlc[];
    storeIds: string | null;
};


/* MILEAGE LOGS */
export type MileageEntryForLog = Omit<
    MileageEntry,
    | "updated_at"
> & {
    submitter_name?: string | null;
    is_locked?: number,
};

export type SubmittedMileageLog = {
    log_id: string;
    created_at: string;
    recipient_emails: string;
    cc_emails: string;
    mileage_entry_ids: string;
    pdf_filename?: string | null;
    submitter_name?: string | null;
    submitter_org?: string | null;
    user_email?: string | null;
};

export type PastMileageLogRow = {
    log_id: string;
    user_email: string;
    created_at: string;
    recipient_emails: string;
    cc_emails: string;
    mileage_entry_ids: string;
    pdf_filename?: string | null;
    submitter_name?: string | null;
    submitter_org?: string | null;
};

export type MileageHeaderData = {
    submitterName: string;
    dateSubmitted: string;
    totalMiles: number;
    totalReimbursement: number;
    mileageTotalsByLlc: Record<string,
        {
            miles: number;
            reimbursementTotal: number;
        }
    >;
    recipients?: string[];
};

export type ExportMileageToSheetsBody = {
    templateId: string;
    month: string;
    year: string | number;
    org: string;
    sheetName: string;
    mileageEntries: MileageEntryForLog[];
};


/* CALCULATIONS */
export type CalculatedMileageValues = {
    entryMethod: MileageEntryMethod;
    totalMiles: number;
    startOdometer: number | null;
    endOdometer: number | null;
};

export type CalculateReimbursementInput = {
    totalMiles: number;
    reimbursementRate?: MileageNumberInput | null;
};

export type CalculatedReimbursement = {
    reimbursementRate: number | null;
    reimbursementTotal: number | null;
};

export type CalculateMileageLlcSplitsInput = {
    llcs: MileageLlc[];
    totalMiles: number;
    reimbursementTotal: number | null;
};

export type CalculateMileageLlcSplitsResult = {
    splitMethod: MileageSplitMethod;
    llcSplits: MileageLlcSplit[];
};


/* RESPONSE TYPES */
export type ApiResponse<T> = {
    success: boolean;
    error?: string;
} & T;

export type MileageCreateResponse = ApiResponse<{
    mileageEntry?: MileageEntry;
}>;

export type MileageViewResponse = ApiResponse<{
    mileageEntries?: MileageEntry[];
}>;

export type MileageUpdateResponse = ApiResponse<{
    mileageEntry?: MileageEntry;
}>;