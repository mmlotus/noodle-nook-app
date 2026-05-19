"use client";

import toast from "react-hot-toast";
import { validatePassword } from "@/lib/passwordRules";
import global from "@/styles/Global.module.css";
import { Check, CircleAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function ChangePasswordPage() {
    const router = useRouter();

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);
    const [attempted, setAttempted] = useState(false);

    const passwordValidation = validatePassword(newPassword);
    const passwordsDoNotMatch =
        confirmPassword.length > 0 &&
        newPassword !== confirmPassword;

    function fieldMissing(value: string) {
        return attempted && !value.trim();
    }

    async function handleSubmit(e: React.SyntheticEvent) {
        e.preventDefault();

        setError("");
        setSuccess("");
        setAttempted(true);

        if (!currentPassword || !newPassword || !confirmPassword) {
            setError("Please fill out all password fields.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("New passwords do not match.");
            return;
        }

        if (currentPassword === newPassword) {
            setError("New password must be different from your current password.");
            return;
        }

        if (!passwordValidation.isValid) {
            setError(passwordValidation.errors[0]);
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/auth/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    currentPassword,
                    newPassword,
                    confirmPassword,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Could not change password.");
                return;
            }

            toast.success("Password changed successfully!");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setAttempted(false);
            router.push("/profile");
        } catch (err) {
            console.error("Change password frontend error:", err);
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className={global.pageWrapper}>
            <section className={global.container}>
                <div className={global.centeredColumn}>
                    <Image
                        className={global.authLogo}
                        src="/icons/NoodleNook-180x180.png"
                        alt="NoodleNook"
                        width={90}
                        height={90}
                    />

                    <h1 className={global.heading} style={{ marginBottom: "6px" }}>Change Password</h1>
                    <p className={global.subcentered} style={{ marginBottom: "24px" }}>
                        Update your account password.
                    </p>
                </div>

                <form className={global.authForm} onSubmit={handleSubmit}>
                    <label className={global.label}>Current Password</label>
                    <input
                        id="currentPassword"
                        type="password"
                        className={`${global.input} ${fieldMissing(currentPassword) ? global.inputError : ""}`}
                        value={currentPassword}
                        onChange={(event) => setCurrentPassword(event.target.value)}
                        autoComplete="current-password"
                        required
                    />

                    <label className={global.label}>New Password</label>
                    <input
                        id="newPassword"
                        type="password"
                        className={`${global.input} ${fieldMissing(newPassword) ? global.inputError : ""}`}
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        autoComplete="new-password"
                        required
                    />

                    <div className={global.passwordRulesBox}>
                        <p className={global.passwordRulesTitle}>Your password must contain:</p>

                        <p className={newPassword.length >= 12 ? global.ruleValid : global.ruleInvalid}>
                            {newPassword.length >= 12
                                ? <Check size={14} />
                                : <CircleAlert size={14} />
                            }
                            At least 12 characters
                        </p>

                        <p className={!passwordValidation.errors.includes("Password must include at least one lowercase letter.") ? global.ruleValid : global.ruleInvalid}>
                            {!passwordValidation.errors.includes("Password must include at least one lowercase letter.")
                                ? <Check size={14} />
                                : <CircleAlert size={14} />
                            }
                            At least 1 lowercase letter (a-z)
                        </p>

                        <p className={!passwordValidation.errors.includes("Password must include at least one uppercase letter.") ? global.ruleValid : global.ruleInvalid}>
                            {!passwordValidation.errors.includes("Password must include at least one uppercase letter.")
                                ? <Check size={14} />
                                : <CircleAlert size={14} />
                            }
                            At least 1 uppercase letter (A-Z)
                        </p>

                        <p className={!passwordValidation.errors.includes("Password must include at least one number.") ? global.ruleValid : global.ruleInvalid}>
                            {!passwordValidation.errors.includes("Password must include at least one number.")
                                ? <Check size={14} />
                                : <CircleAlert size={14} />
                            }
                            At least 1 number (0-9)
                        </p>

                        <p className={!passwordValidation.errors.includes("Password must include at least one special character.") ? global.ruleValid : global.ruleInvalid}>
                            {!passwordValidation.errors.includes("Password must include at least one special character.")
                                ? <Check size={14} />
                                : <CircleAlert size={14} />
                            }
                            At least 1 special charcter (e.g. !@#$%^&*)
                        </p>

                        <p className={!passwordValidation.errors.includes("Password cannot start or end with a space.") ? global.ruleValid : global.ruleInvalid}>
                            {!passwordValidation.errors.includes("Password cannot start or end with a space.")
                                ? <Check size={14} />
                                : <CircleAlert size={14} />
                            }
                            No leading or trailing spaces
                        </p>
                    </div>

                    <label className={global.label}>Confirm Password</label>
                    <input
                        id="confirmPassword"
                        type="password"
                        className={`${global.input} ${fieldMissing(confirmPassword) || passwordsDoNotMatch
                            ? global.inputError
                            : ""
                            }`}
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        autoComplete="new-password"
                        required
                    />

                    {passwordsDoNotMatch && (
                        <p
                            className={global.passwordMismatch}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                marginTop: 14,
                            }}
                        >
                            <CircleAlert size={14} color={"red"} /> Passwords don&apos;t match
                        </p>
                    )}

                    {error && <p className={global.subWarn}>{error}</p>}

                    {success && (
                        <p
                            className={global.ruleValid}
                            style={{
                                gridColumn: "1 / -1",
                                margin: 0,
                                fontWeight: 600,
                                textAlign: "center",
                            }}
                        >
                            {success}
                        </p>
                    )}

                    <button
                        type="submit"
                        className={global.buttonBrand}
                        disabled={loading}
                    >
                        {loading ? "Changing password..." : "Change Password"}
                    </button>

                    <Link
                        href="/profile"
                        className={global.link}
                        style={{ gridColumn: "1 / -1", textAlign: "center" }}
                    >
                        Go back to profile
                    </Link>
                </form>
            </section>
        </main>
    );
}