import { SimpleTrackerFieldConfig, SimpleTrackerFieldValue, SimpleTrackerItem, SimpleTrackerItemFormState } from "@/types/trackers";


export const emptySimpleTrackerItemForm: SimpleTrackerItemFormState = {
    title: "",
    status: "",
    priority: "",
    notes: "",
    url: "",
    tags: [],
    field_values: {},
};

export function getFieldValueAsString(value: SimpleTrackerFieldValue) {
    if (value === null || value === undefined) return "";
    return String(value);
}

export function normalizeSimpleTrackerFieldValue(
    field: SimpleTrackerFieldConfig,
    value: string | boolean
): SimpleTrackerFieldValue {
    if (field.type === "checkbox") {
        return Boolean(value);
    }

    if (field.type === "number") {
        const numericValue = Number(value);
        return Number.isFinite(numericValue) ? numericValue : null;
    }

    return typeof value === "string" ? value : "";
}

export function buildSimpleTrackerFormFromItem(
    item: SimpleTrackerItem
): SimpleTrackerItemFormState {
    return {
        title: item.title,
        status: item.status,
        priority: item.priority || "",
        notes: item.notes || "",
        url: item.url || "",
        tags: item.tags || [],
        field_values: item.field_values || {},
    };
}

export function buildEmptySimpleTrackerForm(
    defaultStatus = ""
): SimpleTrackerItemFormState {
    return {
        ...emptySimpleTrackerItemForm,
        status: defaultStatus,
    };
}