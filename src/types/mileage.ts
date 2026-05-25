/* BASELINE */
export type MileageEntryMethod = "total_miles" | "odometer";

export type MileageNumberInput = number | string | null | undefined;

export type MileageSortOption = "newest" | "oldest" | "highestMiles" | "lowestMiles" | "highestReimb" | "lowestReimb";

/* MILEAGE ENTRIES */
export type MileageEntry = {
    id: string;
    user_id: string;

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

    reimbursement_rate: number | null;
    reimbursement_total: number | null;

    created_at: string;
    updated_at: string;
};

export type MileageCreatePayload = {
    start_date?: string;
    end_date?: string;

    entry_method?: MileageEntryMethod;

    total_miles?: MileageNumberInput;
    start_odometer?: MileageNumberInput;
    end_odometer?: MileageNumberInput;

    start_location?: string | null;
    end_location?: string | null;
    stops?: string | null;

    purpose?: string | null;
    notes?: string | null;

    reimbursement_rate?: MileageNumberInput;
};

export type MileageUpdatePayload = MileageCreatePayload & Pick<MileageEntry, "id">;

export type ValidatedMileagePayload = {
    startDate: string;
    endDate: string;
    
    startLocation: string | null;
    endLocation: string | null;
    stops: string | null;

    purpose: string;
    notes: string | null;
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
    startDate?: string | null;
};

export type CalculatedReimbursement = {
    reimbursementRate: number | null;
    reimbursementTotal: number | null;
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

export type MileageDeleteResponse = ApiResponse<{
    deletedId?: string;
}>;