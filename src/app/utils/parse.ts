export function toNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === "") {
        return null;
    }

    const num = Number(value);
    return Number.isFinite(num) ? num : null;
}

export function toBoolean(value: unknown): boolean {
    return value === true || value === "true" || value === 1 || value === "1";
}

export function cleanText(value: unknown): string | null {
    if (typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null; 
}