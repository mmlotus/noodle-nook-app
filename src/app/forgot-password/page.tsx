"use client";

import toast from "react-hot-toast";
import { validatePassword } from "@/lib/passwordRules";
import global from "@/styles/Global.module.css";
import { Check, CircleAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type ResetStep = "email" | "security";

type SecurityQuestion = {
    questionOrder: number;
    question: string;
};

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [step, setStep] = useState<ResetStep>("email");

    const [email, setEmail] = useState("");
    const [questions, setQuestions] = useState<SecurityQuestion[]>([]);

    const [answers, setAnswers] = useState(["", "", ""]);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);
    const [attempted, setAttempted] = useState(false);

    const passwordValidation = validatePassword(password);
    const passwordsDoNotMatch =
        confirmPassword.length > 0 &&
        password !== confirmPassword;

    const allAnswersComplete = answers.every((answer) => answer.trim());

    function updateAnswer(index: number, value: string) {
        setAnswers((current) => current.map((answer, answerIndex) =>
            answerIndex === index ? value : answer
        ));
    }

    function answerMissing(index: number) {
        return attempted && !answers[index].trim();
    }

    function passwordMissing() {
        return attempted && !password.trim();
    }

    function confirmPasswordMissing() {
        return attempted && !confirmPassword.trim();
    }

    function resetToEmailStep() {
        setStep("email");
        setQuestions([]);
        setAnswers(["", "", ""]);
        setPassword("");
        setConfirmPassword("");
        setError("");
        setSuccess("");
        setAttempted(false);
    }

    async function handleEmailSubmit(e: React.SyntheticEvent) {
        e.preventDefault();

        setError("");
        setSuccess("");
        setAttempted(true);

        const cleanEmail = email.toLowerCase().trim();

        if (!cleanEmail) {
            setError("Please enter your email address.");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/auth/security-question", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: cleanEmail }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Could not load security questions.");
                return;
            }

            const returnedQuestions = Array.isArray(data.questions) ? data.questions : [];

            if (returnedQuestions.length !== 3) {
                setError("This account does not have all three security questions set up.");
                return;
            }

            setQuestions(returnedQuestions);
            setEmail(cleanEmail);
            setAnswers(["", "", ""]);
            setAttempted(false);
            setStep("security");
        } catch (err) {
            console.error("Forgot password email step error:", err);
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    async function handleResetSubmit(e: React.SyntheticEvent) {
        e.preventDefault();

        setError("");
        setSuccess("");
        setAttempted(true);

        if (!allAnswersComplete) {
            setError("Please answer all three security questions.");
            return;
        }

        if (!password || !confirmPassword) {
            setError("Please enter and confirm your new password.");
            return;
        }

        if (passwordsDoNotMatch) {
            setError("Passwords do not match.");
            return;
        }

        if (!passwordValidation.isValid) {
            setError(passwordValidation.errors[0]);
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/auth/reset-password-security", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    answers: questions.map((question, index) => ({
                        questionOrder: question.questionOrder,
                        answer: answers[index],
                    })),
                    password,
                    confirmPassword,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Could not reset password.");
                return;
            }

            setPassword("");
            setConfirmPassword("");
            setAnswers(["", "", ""]);
            toast.success("Password reset successfully! You can now log in.");
            router.push("/login");
        } catch (err) {
            console.error("Reset password error:", err);
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

                    <h1 className={global.heading} style={{ marginBottom: "6px" }}>Reset Password</h1>
                    <p className={global.subcentered} style={{ marginBottom: "24px" }}>
                        Verify your security questions to create a new password.
                    </p>
                </div>

                {step === "email" && (
                    <form className={global.authForm} onSubmit={handleEmailSubmit}>
                        <label className={global.label}>Email</label>
                        <input
                            id="email"
                            type="email"
                            className={`${global.input} ${attempted && !email.trim() ? global.inputError : ""}`}
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            autoComplete="username"
                            required
                        />

                        {error && <p className={global.subWarn}>{error}</p>}

                        <button
                            type="submit"
                            className={global.buttonBrand}
                            disabled={loading}
                        >
                            {loading ? "Loading questions..." : "Continue"}
                        </button>

                        <Link
                            href="/login"
                            className={global.link}
                            style={{ gridColumn: "1 / -1", textAlign: "center" }}
                        >
                            Back to sign in
                        </Link>
                    </form>
                )}

                {step === "security" && (
                    <form className={global.authForm} onSubmit={handleResetSubmit}>
                        <p className={global.formSectionTitle}>Security Questions</p>

                        {questions.map((item, index) => (
                            <div key={item.questionOrder} className={global.securityQuestionGroup}>
                                <label className={global.label}>
                                    Question {item.questionOrder}
                                </label>

                                <p className={global.body} style={{ margin: 0 }}>
                                    {item.question}
                                </p>

                                <label className={global.label}>
                                    Answer {item.questionOrder}
                                </label>

                                <input
                                    id={`securityAnswer${item.questionOrder}`}
                                    type="text"
                                    className={`${global.input} ${answerMissing(index) ? global.inputError : ""}`}
                                    value={answers[index]}
                                    onChange={(event) => updateAnswer(index, event.target.value)}
                                    autoComplete="off"
                                    required
                                />
                            </div>
                        ))}

                        <p className={global.formSectionTitle}>New Password</p>
                        <label className={global.label}>New Password</label>

                        <input
                            id="password"
                            type="password"
                            className={`${global.input} ${passwordMissing() ? global.inputError : ""}`}
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            autoComplete="new-password"
                            required
                        />

                        <div className={global.passwordRulesBox}>
                            <p className={global.passwordRulesTitle}>Your password must contain:</p>

                            <p className={password.length >= 12 ? global.ruleValid : global.ruleInvalid}>
                                {password.length >= 12
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
                            className={`${global.input} ${confirmPasswordMissing() || passwordsDoNotMatch
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
                            disabled={loading || Boolean(success)}
                        >
                            {loading ? "Resetting password..." : "Reset Password"}
                        </button>

                        {success ? (
                            <Link
                                href="/login"
                                className={global.link}
                                style={{ gridColumn: "1 / -1", textAlign: "center" }}
                            >
                                Go to sign in
                            </Link>
                        ) : (
                            <button
                                type="button"
                                className={global.buttonSecondary}
                                style={{ gridColumn: "1 / -1" }}
                                onClick={resetToEmailStep}
                            >
                                Use a different email
                            </button>
                        )}
                    </form>
                )}
            </section>
        </main>
    );
}