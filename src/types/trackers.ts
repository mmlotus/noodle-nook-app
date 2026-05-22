export type SimpleTrackerFieldType =
    | "text"
    | "textarea"
    | "number"
    | "date"
    | "select"
    | "checkbox";

export type SimpleTrackerFieldValue = string | number | boolean | null;

export type SimpleTrackerFieldConfig = {
    key: string;
    label: string;
    type: SimpleTrackerFieldType;
    options?: string[];
    required?: boolean;
};

export type SimpleTrackerTemplate = {
    key: string;
    name: string;
    slug: string;
    description: string;
    statuses: string[];
    fields: SimpleTrackerFieldConfig[];
    tags: string[];
};

export type SimpleTracker = {
    id: string;
    user_id: string;
    name: string;
    slug: string;
    template_key: string | null;
    tracker_kind: string;
    description: string | null;
    status_options: string[];
    field_config: SimpleTrackerFieldConfig[];
    tag_options: string[];
    is_archived: boolean;
    created_at: string;
    updated_at: string;
};

export type SimpleTrackerItem = {
    id: string;
    tracker_id: string;
    user_id: string;
    title: string;
    status: string;
    priority: string | null;
    notes: string | null;
    url: string | null;
    tags: string[];
    field_values: Record<string, string | number | boolean | null>;
    sort_order: number | null;
    is_archived: boolean;
    created_at: string;
    updated_at: string;
};

export type SimpleTrackerItemFormState = {
    title: string;
    status: string;
    priority: string;
    notes: string;
    url: string;
    tags: string[];
    field_values: Record<string, SimpleTrackerFieldValue>;
};


/* COMPONENT PAGE TYPES */

export type SimpleTrackerPageProps = {
    trackerSlug: string;
};

export type TrackerFilters = {
    search: string;
    status: string;
    tag: string;
};

export const defaultFilters: TrackerFilters = {
    search: "",
    status: "",
    tag: "",
};