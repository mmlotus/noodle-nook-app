export type AllocationAccount = {
    id: string;
    name: string;
    createdAt: string;
};

export type AllocationRule = {
    id: string;
    destinationAccountId: string;
    destinationAccountName: string;
    fixedAmount: number;
    percentage: number;
    sortOrder: number;
};

export type AllocationPreset = {
    id: string;
    name: string;
    sourceAccountId: string;
    sourceAccountName: string;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
    rules: AllocationRule[];
};

export type AllocationRuleInput = {
    destinationAccountId: string;
    fixedAmount: number;
    percentage: number;
};

export type CreateAllocationPresetPayload = {
    name: string;
    sourceAccountId: string;
    rules: AllocationRuleInput[];
};

export type UpdateAllocationPresetPayload = {
    name: string;
    sourceAccontId: string;
    rules: AllocationRuleInput[];
};

export type AllocationResultLine = {
    destinationAccountId: string;
    destinationAccountName: string;
    fixedAmount: number;
    percentage: number;
    calculatedAmount: number;
};

export type AllocationCalculation = {
    id: string;
    presetId: string | null;
    presetName: string;
    sourceAccountName: string;
    amountToAllocate: number;
    totalAllocated: number;
    amountRemaining: number;
    results: AllocationResultLine[];
    createdAt: string;
};

export type CalculateAllocationPayload = {
    presetId: string;
    amountToAllocate: number;
};

export type AllocationRuleForm = {
    destinationAccountId: string;
    fixedAmount: string;
    percentage: string;
};

export type AllocationPresetForm = {
    name: string;
    sourceAccountId: string;
    rules: AllocationRuleForm[];
};