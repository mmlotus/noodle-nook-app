import { NextResponse } from "next/server";

export function cleanString(value: unknown) {
    return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function cleanSlug(value: string) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export function cleanStringArray(value: unknown) {
    if (!Array.isArray(value)) return [];

    return value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean);
}

export function jsonError(message: string, status = 400) {
    return NextResponse.json({ error: message }, { status });
}

export function serverError(routeName: string, err: unknown) {
    console.error(`${routeName} error:`, err);

    return NextResponse.json(
        { error: "Internal server error." },
        { status: 500 }
    );
}

export function jsonOk(data: Record<string, unknown>, status = 200) {
    return NextResponse.json(data, { status });
}