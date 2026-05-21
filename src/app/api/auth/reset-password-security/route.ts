import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { NextRequest } from "next/server";
import { validatePassword } from "@/lib/passwordRules";
import { compareSecurityAnswer } from "@/lib/securityQuestions";
import { jsonError, jsonOk, serverError } from "@/lib/api/apiUtils";

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
            return jsonError("Email, password, and confirm password are required.", 400);
        }

        if (!Array.isArray(answers) || answers.length !== 3) {
            return jsonError("All three security answers are required.", 400);
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
            return jsonError("All three security answers are required.", 400);
        }

        const uniqueQuestionOrders = new Set(cleanedAnswers.map((item) => item.questionOrder));

        if (uniqueQuestionOrders.size !== 3) {
            return jsonError("Security answers are invalid.", 400);
        }

        if (password !== confirmPassword) return jsonError("Passwords do not match.", 400);

        const passwordCheck = validatePassword(password);

        if (!passwordCheck.isValid) {
            return jsonError(passwordCheck.errors[0], 400);
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
            return jsonError("Could not reset password.", 400);
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
            return jsonError(
                "This account does not have all three security questions set up.",
                400
            );
        }

        for (const savedQuestion of savedQuestions) {
            const matchingAnswer = cleanedAnswers.find((item) => item.questionOrder === savedQuestion.questionOrder);

            if (!matchingAnswer) {
                return jsonError("Security answers are invalid.", 400);
            }

            const answerMatches = await compareSecurityAnswer(
                matchingAnswer.answer,
                savedQuestion.answerHash
            );

            if (!answerMatches) {
                return jsonError("One or more security answers are incorrect.", 400);
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

        return jsonOk({ message: "Password reset successfully!" });
    } catch (err) {
        return serverError("Security password reset", err);
    }
}