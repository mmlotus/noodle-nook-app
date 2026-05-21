import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { validatePassword } from "@/lib/passwordRules";
import { withUser } from "@/lib/api/withUser";
import { jsonError, jsonOk, serverError } from "@/lib/api/apiUtils";

export const POST = withUser(async (req, _context, user) => {
    try {
        const body = await req.json();

        const currentPassword = String(body.currentPassword || "");
        const newPassword = String(body.newPassword || "");
        const confirmPassword = String(body.confirmPassword || "");

        if (!currentPassword || !newPassword || !confirmPassword) {
            return jsonError("Please fill out all password fields.", 400);
        }

        if (newPassword !== confirmPassword) {
            return jsonError("New passwords do not match.", 400);
        }

        if (currentPassword === newPassword) {
            return jsonError(
                "New password must be different from your current password.",
                400
            );
        }

        const passwordCheck = validatePassword(newPassword);

        if (!passwordCheck.isValid) {
            return jsonError(passwordCheck.errors[0], 400);
        }

        const userResult = await db.query(
            `
            SELECT id, email, password_hash
            FROM users
            WHERE id = $1
            LIMIT 1
            `,
            [user.id]
        );

        if (userResult.length === 0) return jsonError("User not found.", 404);

        const dbUser = userResult[0];

        const currentPasswordMatches = await bcrypt.compare(currentPassword, dbUser.password_hash);

        if (!currentPasswordMatches) return jsonError("Current password is incorrect.", 400);

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

        if (updateResult.length === 0) return jsonError("Could not update password.", 500);

        return jsonOk({
            success: true,
            message: "Password changed successfully!"
        });
    } catch (err) {
        return serverError("Change password", err);
    }
});