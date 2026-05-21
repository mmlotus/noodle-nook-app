import { NextRequest } from "next/server";
import { getUserByEmail } from "../userHelpers";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import db from "@/lib/db";
import { validatePassword } from "@/lib/passwordRules";
import { hashSecurityAnswer, isValidSecurityQuestion } from "@/lib/securityQuestions";
import { jsonError, jsonOk, serverError } from "@/lib/api/apiUtils";

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
            return jsonError("Please fill out all fields.", 400);
        }

        if (!email.includes("@")) {
            return jsonError("Please enter a valid email address.", 400);
        }

        if (password !== confirmPassword) {
            return jsonError("Passwords do not match.", 400);
        }

        if (!passwordCheck.isValid) {
            return jsonError(passwordCheck.errors[0], 400);
        }

        if (!Array.isArray(securityQuestions) || securityQuestions.length !== 3) {
            return jsonError("Three security questions are required.", 400);
        }

        const cleanedSecurityQuestions = securityQuestions.map(
            (item: SecurityQuestionInput, index: number) => ({
                questionOrder: index + 1,
                question: String(item.question || "").trim(),
                answer: String(item.answer || "").trim(),
            })
        );

        if (cleanedSecurityQuestions.some((item) => !item.question || !item.answer)) {
            return jsonError("All security questions and answers are required.", 400);
        }

        if (cleanedSecurityQuestions.some((item) => !isValidSecurityQuestion(item.question))) {
            return jsonError("Please choose valid security questions.", 400);
        }

        const uniqueQuestions = new Set(
            cleanedSecurityQuestions.map((item) => item.question)
        );

        if (uniqueQuestions.size !== 3) {
            return jsonError("Security questions must be different.", 400);
        }

        if (cleanedSecurityQuestions.some((item) => item.answer.length < 2)) {
            return jsonError("Security answers must be at least 2 characters.", 400);
        }

        const existingUser = await getUserByEmail(email);

        if (existingUser) {
            return jsonError("An account already exists with this email.", 409);
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

            return jsonOk({ user: result[0] }, 201);
        } catch (error) {
            await db.query("ROLLBACK");
            return serverError("Register transaction", error);
        }
    } catch (error) {
        return serverError("Register", error);
    }
}