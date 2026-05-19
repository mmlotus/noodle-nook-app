import db from "@/lib/db";
import { getCurrentUser } from "@/app/api/auth/userHelpers";
import { NextRequest, NextResponse } from "next/server";

const allowedThemes = ["system", "light", "dark"];
const allowedWeightUnits = ["lb", "kg", "g", "st"];

export async function GET(req: NextRequest) {
    let userEmail = "";

    try {
        const user = await getCurrentUser(req);
        userEmail = user.email;
    } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const result = await db.query(
            `SELECT
                id,
                email,
                name,
                subtitle_choice,
                theme_preference,
                preferred_weight_unit
            FROM users WHERE email = $1
            `,
            [userEmail]
        );

        const user = result[0];

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json(user, { status: 200 });
    } catch (err) {
        console.error("GET /api/profiles/user-profile error:", err);

        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    let userEmail = "";

    try {
        const user = await getCurrentUser(req);
        userEmail = user.email;
    } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { name, subtitle_choice, theme_preference, preferred_weight_unit } = await req.json();

        if (!name || typeof name !== "string") {
            return NextResponse.json({ error: "Invalid name" }, { status: 400 });
        }

        if (theme_preference !== undefined && (typeof theme_preference !== "string" || !allowedThemes.includes(theme_preference))
        ) {
            return NextResponse.json(
                { error: "Invalid theme preference" },
                { status: 400 }
            );
        }

        if (preferred_weight_unit !== undefined && (typeof preferred_weight_unit !== "string" || !allowedWeightUnits.includes(preferred_weight_unit))
        ) {
            return NextResponse.json(
                { error: "Preferred weight unit is invalid" },
                { status: 400 }
            );
        }

        const result = await db.query(
            `
                UPDATE users
                SET
                    name = $1,
                    subtitle_choice = $2,
                    theme_preference = $3,
                    preferred_weight_unit = $4
                WHERE email = $5
                RETURNING id, email, name, subtitle_choice, theme_preference, preferred_weight_unit
            `,
            [
                name.trim(),
                subtitle_choice || "",
                theme_preference || "system",
                preferred_weight_unit || "lb",
                userEmail,
            ]
        );

        if (result.length === 0) {
            return NextResponse.json(
                { error: "User not found or unchanged." },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, user: result[0] }, { status: 200 });
    } catch (err) {
        console.error("POST /api/profiles/user-profile error:", err);

        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}