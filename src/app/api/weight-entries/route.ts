import db from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "../auth/userHelpers";

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
            `
                SELECT
                    we.id,
                    we.user_id,
                    we.entry_date,
                    we.weight_lb,
                    we.notes,
                    we.created_at,
                    we.updated_at
                FROM weight_entries we
                JOIN users u ON u.id = we.user_id
                WHERE LOWER(u.email) = LOWER($1)
                ORDER BY we.entry_date ASC
            `,
            [userEmail]
        );

        return NextResponse.json({ entries: result }, { status: 200 });
    } catch (err) {
        console.error("GET /api/weight-entries error:", err);

        return NextResponse.json(
            { error: "Internal server error." },
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
        const { entry_date, weight_lb, notes } = await req.json();

        if (!entry_date || typeof entry_date !== "string") {
            return NextResponse.json(
                { error: "Invalid entry date" },
                { status: 400 }
            );
        }

        if (
            typeof weight_lb !== "number" ||
            !Number.isFinite(weight_lb) ||
            weight_lb <= 0
        ) {
            return NextResponse.json(
                { error: "Invalid weight" },
                { status: 400 }
            );
        }

        const result = await db.query(
            `
                INSERT INTO weight_entries (
                    user_id,
                    entry_date,
                    weight_lb,
                    notes,
                    updated_at
                )
                SELECT
                    u.id,
                    $2,
                    $3,
                    $4,
                    NOW()
                FROM users u
                WHERE LOWER(u.email) = LOWER($1)
                ON CONFLICT (user_id, entry_date)
                DO UPDATE SET
                    weight_lb = EXCLUDED.weight_lb,
                    notes = EXCLUDED.notes,
                    updated_at = NOW()
                RETURNING
                    id,
                    user_id,
                    entry_date,
                    weight_lb,
                    notes,
                    created_at,
                    updated_at
            `,
            [
                userEmail,
                entry_date,
                weight_lb,
                typeof notes === "string" && notes.trim() ? notes.trim() : null,
            ]
        );

        if (result.length === 0) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { success: true, entry: result[0] },
            { status: 200 }
        );
    } catch (err) {
        console.error("POST /api/weight-entries error:", err);

        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function DELETE(req: NextRequest) {
    let userEmail = "";

    try {
        const user = await getCurrentUser(req);
        userEmail = user.email;
    } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { entry_date } = await req.json();

        if (!entry_date || typeof entry_date !== "string") {
            return NextResponse.json(
                { error: "Invalid entry date" },
                { status: 400 }
            );
        }

        await db.query(
            `
                DELETE FROM weight_entries
                USING users u
                WHERE weight_entries.user_id = u.id
                  AND LOWER(u.email) = LOWER($1)
                  AND weight_entries.entry_date = $2
            `,
            [userEmail, entry_date]
        );

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (err) {
        console.error("DELETE /api/weight-entries error:", err);

        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}