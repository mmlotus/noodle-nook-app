import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "../userHelpers";
import { validatePassword } from "@/lib/passwordRules";

export async function POST(req: NextRequest) {
    let userEmail = "";

    try {
        const user = await getCurrentUser(req);
        userEmail = user.email;
    } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();

        const currentPassword = String(body.currentPassword || "");
        const newPassword = String(body.newPassword || "");
        const confirmPassword = String(body.confirmPassword || "");

        if (!currentPassword || !newPassword || !confirmPassword) {
            return NextResponse.json(
                { error: "Please fill out all password fields." },
                { status: 400 }
            );
        }

        if (newPassword !== confirmPassword) {
            return NextResponse.json(
                { error: "New passwords do not match." },
                { status: 400 }
            );
        }

        if (currentPassword === newPassword) {
            return NextResponse.json(
                { error: "New password must be different from your current password." },
                { status: 400 }
            );
        }

        const passwordCheck = validatePassword(newPassword);

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
            SELECT id, email, password_hash
            FROM users
            WHERE email = $1
            LIMIT 1
            `,
            [userEmail]
        );

        if (userResult.length === 0) {
            return NextResponse.json(
                { error: "User not found." },
                { status: 404 }
            );
        }

        const user = userResult[0];

        const currentPasswordMatches = await bcrypt.compare(currentPassword, user.password_hash);

        if (!currentPasswordMatches) {
            return NextResponse.json(
                { error: "Current password is incorrect." },
                { status: 400 }
            );
        }

        const newPasswordHash = await bcrypt.hash(newPassword, 12);

        const updateResult = await db.query(
            `
            UPDATE users
            SET
                password_hash = $1,
                updated_at = NOW()
            WHERE id = $2
            RETURNING id, email
            `,
            [newPasswordHash, user.id]
        );

        if (updateResult.length === 0) {
            return NextResponse.json(
                { error: "Could not update password." },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { success: true, message: "Password changed successfully!" },
            { status : 200 }
        );
    } catch (err) {
        console.error("Change password error:", err);

        return NextResponse.json(
            { error: "Something went wrong while changing your password." },
            { status: 500 }
        );
    }
}