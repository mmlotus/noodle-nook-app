import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail } from "../userHelpers";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import db from "@/lib/db";
import { validatePassword } from "@/lib/passwordRules";
import { hashSecurityAnswer, isValidSecurityQuestion } from "@/lib/securityQuestions";

type SecurityQuestionInput = {
    question?: string;
    answer?: string;
};

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const name = String(body.name || "").trim();
        const email = String(body.email || "").toLowerCase().trim();
        const password = String(body.password || "");
        const confirmPassword = String(body.confirmPassword || "");
        const passwordCheck = validatePassword(password);
        const securityQuestions = body.securityQuestions;

        if (!name || !email || !password || !confirmPassword) {
            return NextResponse.json(
                { error: "Please fill out all fields." },
                { status: 400 }
            );
        }

        if (!email.includes("@")) {
            return NextResponse.json(
                { error: "Please enter a valid email address." },
                { status: 400 }
            );
        }

        if (password !== confirmPassword) {
            return NextResponse.json(
                { error: "Passwords do not match." },
                { status: 400 }
            );
        }

        if (!passwordCheck.isValid) {
            return NextResponse.json(
                { error: passwordCheck.errors[0], errors: passwordCheck.errors },
                { status: 400 }
            );
        }

        if (!Array.isArray(securityQuestions) || securityQuestions.length !== 3) {
            return NextResponse.json(
                { error: "Three security questions are required." },
                { status: 400 }
            );
        }

        const cleanedSecurityQuestions = securityQuestions.map(
            (item: SecurityQuestionInput, index: number) => ({
                questionOrder: index + 1,
                question: String(item.question || "").trim(),
                answer: String(item.answer || "").trim(),
            })
        );

        if (cleanedSecurityQuestions.some((item) => !item.question || !item.answer)) {
            return NextResponse.json(
                { error: "All security questions and answers are required." },
                { status: 400 }
            );
        }

        if (cleanedSecurityQuestions.some((item) => !isValidSecurityQuestion(item.question))) {
            return NextResponse.json(
                { error: "Please choose valid security questions." },
                { status: 400 }
            );
        }

        const uniqueQuestions = new Set(
            cleanedSecurityQuestions.map((item) => item.question)
        );

        if (uniqueQuestions.size !== 3) {
            return NextResponse.json(
                { error: "Security questions must be different." },
                { status: 400 }
            );
        }

        if (cleanedSecurityQuestions.some((item) => item.answer.length < 2)) {
            return NextResponse.json(
                { error: "Security answers must be at least 2 characters." },
                { status: 400 }
            );
        }

        const existingUser = await getUserByEmail(email);

        if (existingUser) {
            return NextResponse.json(
                { error: "An account already exists with this email." },
                { status: 409 }
            );
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const userId = randomUUID();

        await db.query("BEGIN");

        try {
            const result = await db.query(
                `
            INSERT INTO users (
                id,
                name,
                email,
                password_hash
            )
            VALUES ($1, $2, $3, $4)
            RETURNING id, name, email
            `,
                [userId, name.trim(), email, passwordHash]
            );

            for (const item of cleanedSecurityQuestions) {
                const answerHash = await hashSecurityAnswer(item.answer);

                await db.query(
                    `
                INSERT INTO user_security_questions (
                    user_id,
                    question_order,
                    question,
                    answer_hash
                )
                VALUES ($1, $2, $3, $4)
                `,
                    [userId, item.questionOrder, item.question, answerHash]
                );
            }

            await db.query("COMMIT");

            return NextResponse.json(
                { user: result[0] },
                { status: 201 }
            );
        } catch (error) {
            await db.query("ROLLBACK");
            console.error("Register transaction error:", error);

            return NextResponse.json(
                { error: "Something went wrong while creating your account." },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error("Register error:", error);

        return NextResponse.json(
            { error: "Something went wrong while creating your account." },
            { status: 500 }
        );
    }
}