import { BudgetTheme, BudgetThemeKey } from "@/types/budget";

export const budgetThemes: Record<BudgetThemeKey, BudgetTheme> = {
    berries: {
        key: "berries",
        label: "Berries",
        pending: "#8679becc",
        pendingText: "#ffffff",
        completed: "#4b407a",
        completedText: "#ffffff",
        skipped: "#ae9eb4",
        skippedText: "#ffffff",
    },

    azure: {
        key: "azure",
        label: "Azure",
        pending: "#7199db",
        pendingText: "#ffffff",
        completed: "#24408f",
        completedText: "#ffffff",
        skipped: "#aebed6",
        skippedText: "#ffffff",
    },

    sage: {
        key: "sage",
        label: "Sage",
        pending: "#7a9e62",
        pendingText: "#ffffff",
        completed: "#4f6f3e",
        completedText: "#ffffff",
        skipped: "#92a18b",
        skippedText: "#ffffff",
    },

    seafoam: {
        key: "seafoam",
        label: "Seafoam",
        pending: "#2fae9b",
        pendingText: "#ffffff",
        completed: "#16766c",
        completedText: "#ffffff",
        skipped: "#778f8c",
        skippedText: "#ffffff",
    },

    citrus: {
        key: "citrus",
        label: "Citrus",
        pending: "#f2a51a",
        pendingText: "#2b2111",
        completed: "#c86d0c",
        completedText: "#ffffff",
        skipped: "#8a7557",
        skippedText: "#ffffff",
    },

    blush: {
        key: "blush",
        label: "Blush",
        pending: "#d96b92",
        pendingText: "#ffffff",
        completed: "#a53660",
        completedText: "#ffffff",
        skipped: "#8b6a77",
        skippedText: "#ffffff",
    },
};

export const budgetThemeOptions = Object.values(budgetThemes);

export function getBudgetTheme(
    themeKey: BudgetThemeKey | null | undefined
): BudgetTheme {
    return budgetThemes[themeKey || "berries"] || budgetThemes.berries;
}