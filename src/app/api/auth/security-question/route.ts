import { jsonError, jsonOk, serverError } from "@/lib/api/apiUtils";
import db from "@/lib/db";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const email = String(body.email || "").toLowerCase().trim();

        if (!email) return jsonError("Email is required.", 400);

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
            return jsonError("No account was found with that email.", 404);
        }

        const dbUser = userResult[0];

        const questionsResult = await db.query(
            `
            SELECT
                question_order AS "questionOrder",
                question
            FROM user_security_questions
            WHERE user_id = $1
            ORDER BY question_order ASC
            `,
            [dbUser.id]
        );

        if (questionsResult.length !== 3) {
            return jsonError(
                "This account does not have all three security questions set up.",
                400
            );
        }

        return jsonOk({ questions: questionsResult });
    } catch (err) {
        return serverError("Security question lookup", err);
    }
}