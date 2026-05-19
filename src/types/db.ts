import { WeightUnit } from "@/lib/weight/weightUtils";

export type Kind = string | number | boolean | null | undefined;

export type User = {
    id: number;
    email: string;
    name: string | null;
    password_hash: string;
    created_at?: string;
};

export type UserRow = {
    id: number;
    email: string;
    name: string | null;
    created_at: Date | string | null;
    tooltips_enabled: number;
    dismissed_tooltips: string | null;
    theme_preference: "system" | "light" | "dark";
    subtitle_choice: string | null;
    preferred_weight_unit: WeightUnit | null;
};

export type ChartRange = "7d" | "30d" | "90d" | "6m" | "1y" | "all";