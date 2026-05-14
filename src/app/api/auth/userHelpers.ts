import db from "@/lib/dbPostgres";
import { createVerificationToken } from "@/lib/userTokens";
import { getToken } from "next-auth/jwt";
import { Resend } from "resend";
import { NextRequest } from "next/server";

type NewUser = {
    email: string;
    name?: string;
    company?: string;
    created_at: string;
};

export async function createUser({ email, name, company, created_at }: NewUser) {
    await db.query(
        `INSERT INTO users (email, name, company, created_at)
        VALUES ($1, $2, $3, $4)`,
        [email, name, company, created_at]       
    );
}

export async function getUserByEmail(email: string) {
    const result = await db.query("SELECT * FROM users WHERE LOWER(email) = LOWER($1)", [email]);
        return result.rows[0];
}

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(email: string) {
    const token = await createVerificationToken(email);
    const verifyUrl = `${process.env.NEXTAUTH_URL}/verify?token=${token}&email=${encodeURIComponent(email)}`;

    await resend.emails.send({
        from: "Access Team <no-reply@vaporhat.com>",
        to: email,
        subject: "Verify Your My Expenses Account",
        html: `
            <p>Please click the link below to verify your email address:</p>
            <p><a href="${verifyUrl}">${verifyUrl}</a></p>
        `,
    });
}

export async function getCurrentUser(req: NextRequest) {
    const token = await getToken({ req });

    if (!token?.email) {
        throw new Error("Unauthorized");
    }

    return {
        email: token.email,
        name: token.name,
        role: token.role,
        org: token.org || "",
        email_verified: token.email_verified,
        id: token.id ?? 0,
        org_access: token.org_access ?? [],
        user_access: token.user_access ?? [],
    };
}