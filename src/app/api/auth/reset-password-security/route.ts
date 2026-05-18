import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { validatePassword } from "@/lib/passwordRules";
import { compareSecurityAnswer } from "@/lib/securityQuestions";

type SecurityAnswerInput = {
    questionOrder?: number;
    answer?: string;
};

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const email = String(body.email || "").toLowerCase().trim();
        const password = String(body.password || "");
        const confirmPassword = String(body.confirmPassword || "");
        const answers = body.answers;

        if (!email || !password || !confirmPassword) {
            return NextResponse.json(
                { error: "Email, password, and confirm password are required." },
                { status: 400 }
            );
        }

        if (!Array.isArray(answers) || answers.length !== 3) {
            return NextResponse.json(
                { error: "All three security answers are required." },
                { status: 400 }
            );
        }

        const cleanedAnswers = answers.map((item: SecurityAnswerInput) => ({
            questionOrder: Number(item.questionOrder),
            answer: String(item.answer || "").trim(),
        }));

        if (cleanedAnswers.some((item) =>
            !item.questionOrder ||
            ![1, 2, 3].includes(item.questionOrder) ||
            !item.answer
        )) {
            return NextResponse.json(
                { error: "All three security answers are required." },
                { status: 400 }
            );
        }

        const uniqueQuestionOrders = new Set(cleanedAnswers.map((item) => item.questionOrder));

        if (uniqueQuestionOrders.size !== 3) {
            return NextResponse.json(
                { error: "Security answers are invalid." },
                { status: 400 }
            );
        }

        if (password !== confirmPassword) {
            return NextResponse.json(
                { error: "Passwords do not match." },
                { status: 400 }
            );
        }

        const passwordCheck = validatePassword(password);

        if (!passwordCheck.isValid) {
            return NextResponse.json(
                {
                    error: passwordCheck.errors[0],
                    errors: passwordCheck.errors,
                },
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
                { error: "Could not reset password." },
                { status: 400 }
            );
        }

        const user = userResult[0];

        const savedQuestions = await db.query(
            `
            SELECT
                question_order AS "questionOrder",
                answer_hash AS "answerHash"
            FROM user_security_questions
            WHERE user_id = $1
            ORDER BY question_order ASC
            `,
            [user.id]
        );

        if (savedQuestions.length !== 3) {
            return NextResponse.json(
                { error: "This account does not have all three security questions set up." },
                { status: 400 }
            );
        }

        for (const savedQuestion of savedQuestions) {
            const matchingAnswer = cleanedAnswers.find((item) => item.questionOrder === savedQuestion.questionOrder);

            if (!matchingAnswer) {
                return NextResponse.json(
                    { error: "Security answers are invalid." },
                    { status: 400 }
                );
            }

            const answerMatches = await compareSecurityAnswer(
                matchingAnswer.answer,
                savedQuestion.answerHash
            );

            if (!answerMatches) {
                return NextResponse.json(
                    { error: "One or more security answers are incorrect." },
                    { status: 400 }
                );
            }
        }

        const passwordHash = await bcrypt.hash(password, 12);

        await db.query(
            `
            UPDATE users
            SET
                password_hash = $1,
                updated_at = NOW()
            WHERE id = $2
            `,
            [passwordHash, user.id]
        );

        return NextResponse.json(
            { message: "Password reset successfully!" },
            { status: 200 }
        );
    } catch (err) {
        console.error("Security password reset error:", err);

        return NextResponse.json(
            { error: "Something went wrong while resetting your password." },
            { status: 500 }
        );
    }
}