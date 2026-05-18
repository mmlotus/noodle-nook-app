import db from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const email = String(body.email || "").toLowerCase().trim();

        if (!email) {
            return NextResponse.json(
                { error: "Email is required." },
                { status: 400 }
            );
        }

        const userResult = await db.query(
            `
            SELECT id, email
            FROM users
            WHERE email = $1
            LIMIT 1
            `,
            [email]
        );

        if (userResult.length === 0) {
            return NextResponse.json(
                { error: "No account was found with that email." },
                { status: 404 }
            );
        }

        const user = userResult[0];

        const questionsResult = await db.query(
            `
            SELECT
                question_order AS "questionOrder",
                question
            FROM user_security_questions
            WHERE user_id = $1
            ORDER BY question_order ASC
            `,
            [user.id]
        );

        if (questionsResult.length !== 3) {
            return NextResponse.json(
                { error: "This account does not have all three security questions set up." },
                { status: 400 }
            );
        }

        return NextResponse.json(
            {
                questions: questionsResult,
            },
            { status: 200 }
        );
    } catch (err) {
        console.error("Security question lookup error:", err);

        return NextResponse.json(
            { error: "Something went wrong while loading security questions." },
            { status: 500 }
        );
    }
}