import db from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "../auth/userHelpers";

async function getUserEmail(req: NextRequest) {
    const user = await getCurrentUser(req);

    if (!user?.email) {
        throw new Error("Unauthorized");
    }

    return user.email;
}

export async function GET(req: NextRequest) {
    let userEmail = "";

    try {
        userEmail = await getUserEmail(req);
    } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const result = await db.query(
            "SELECT tooltips_enabled, dismissed_tooltips FROM users WHERE email = $1",
            [userEmail]
        );

        if (result.length === 0) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const user = result[0];

        return NextResponse.json(
            {
                tooltipsEnabled: user.tooltips_enabled,
                dismissed: JSON.parse(user.dismissed_tooltips || "[]"),
            },
            { status: 200 }
        );
    } catch (err) {
        console.error("Tooltip API GET error:", err);

        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function PATCH(req: NextRequest) {
    let userEmail = "";

    try {
        userEmail = await getUserEmail(req);
    } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { tooltipsEnabled, dismissed } = await req.json();

        if (tooltipsEnabled !== undefined && typeof tooltipsEnabled !== "boolean") {
            return NextResponse.json({ error: "tooltipsEnabled must be a boolean" }, { status: 400 });
        }

        if (dismissed !== undefined && !Array.isArray(dismissed)) {
            return NextResponse.json({ error: "dismissed must be an array of strings" }, { status: 400 });
        }

        await db.query(
            `
            UPDATE users
            SET
                tooltips_enabled = COALESCE($1, tooltips_enabled),
                dismissed_tooltips = COALESCE($2, dismissed_tooltips)
            WHERE email = $3
            `,
            [
                tooltipsEnabled !== undefined ? (tooltipsEnabled ? 1 : 0) : null,
                dismissed !== undefined ? JSON.stringify(dismissed) : null,
                userEmail,
            ]
        );

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (err) {
        console.error("Tooltip API PATCH error:", err);

        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}