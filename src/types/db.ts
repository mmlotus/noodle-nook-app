export type Kind = string | number | boolean | null | undefined;

export type User = {
    id: number;
    email: string;
    name?: string;
    email_alt?: string;
    email_verified: number;
    company?: string;
    role?: string;
    created_at?: string;
    org_access?: string[];
    user_access?: string[];
};

export type UserRow = {
    id: number;
    email: string;
    name: string | null;
    email_alt: string | null;
    email_verified: number;
    company: string | null;
    role: string;
    created_at: Date | string | null;
    tooltips_enabled: number;
    dismissed_tooltips: string | null;
    org_access: string[];
    user_access: string[];
    theme_preference: "system" | "light" | "dark";
};