"use client";

import global from "@/styles/Global.module.css";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { validatePassword } from "@/lib/passwordRules";
import { Check, CircleAlert } from "lucide-react";
import { SECURITY_QUESTIONS } from "@/lib/securityQuestions";
import Link from "next/link";
import Image from "next/image";

type Mode = "login" | "register";

function LoginContent() {
    const { status } = useSession();
    const searchParams = useSearchParams();

    const callbackUrl = searchParams.get("callbackUrl") || "/home";

    const [mode, setMode] = useState<Mode>("login");

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [securityQuestions, setSecurityQuestions] = useState([
        { question: "", answer: "" },
        { question: "", answer: "" },
        { question: "", answer: "" },
    ]);

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const passwordValidation = validatePassword(password);

    const passwordsDoNotMatch =
        mode === "register" &&
        confirmPassword.length > 0 &&
        password !== confirmPassword;

    const [registerAttempted, setRegisterAttempted] = useState(false);

    useEffect(() => {
        if (status === "authenticated") {
            window.location.href = "/home";
        }
    }, [status]);

    function updateSecurityQuestion(index: number, value: string) {
        setSecurityQuestions((current) => current.map((item, itemIndex) =>
            itemIndex === index
                ? { ...item, question: value }
                : item
        ));
    }

    function updateSecurityAnswer(index: number, value: string) {
        setSecurityQuestions((current) => current.map((item, itemIndex) =>
            itemIndex === index
                ? { ...item, answer: value }
                : item
        ));
    }

    function getAvailSecurityQuestions(currentIndex: number) {
        const selectedByOtherDropdowns = securityQuestions
            .map((item, index) => (index === currentIndex ? "" : item.question))
            .filter(Boolean);

        return SECURITY_QUESTIONS.filter(
            (question) => !selectedByOtherDropdowns.includes(question)
        );
    }

    const allSecurityQuestionsComplete = securityQuestions.every(
        (item) => item.question && item.answer.trim()
    );

    function securityFieldMissing(index: number, field: "question" | "answer") {
        return (
            mode === "register" &&
            registerAttempted &&
            !securityQuestions[index][field].trim()
        );
    }

    function resetMode(nextMode: Mode) {
        setMode(nextMode);
        setError("");
        setPassword("");
        setConfirmPassword("");
        setRegisterAttempted(false);
    }

    async function handleLogin() {
        const cleanEmail = email.toLowerCase().trim();

        const result = await signIn("credentials", {
            email: cleanEmail,
            password,
            redirect: false,
            callbackUrl,
        });

        if (result?.error) {
            setError("Invalid email or password.");
            return;
        }

        window.location.href = result?.url || callbackUrl;
    }

    async function handleRegister() {
        const cleanEmail = email.toLowerCase().trim();

        const response = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name,
                email: cleanEmail,
                password,
                confirmPassword,
                securityQuestions,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            setError(data.error || "Could not create account.");
            return;
        }

        const result = await signIn("credentials", {
            email: cleanEmail,
            password,
            redirect: false,
            callbackUrl,
        });

        if (result?.error) {
            setError("Account created, but sign in failed. Please try signing in.");
            setMode("login");
            return;
        }

        window.location.href = result?.url || callbackUrl;
    }

    async function handleSubmit(e: React.SyntheticEvent) {
        e.preventDefault();

        if (mode === "register") {
            setRegisterAttempted(true);

            if (!allSecurityQuestionsComplete) {
                setError("Please complete all three security questions.");
                return;
            }
        }

        setError("");
        setLoading(true);

        try {
            if (mode === "login") {
                await handleLogin();
            } else {
                await handleRegister();
            }
        } catch (err) {
            console.error("Login/register error:", err);
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    const submitText = mode === "login"
        ? loading
            ? "Signing in..."
            : "Sign In"
        : loading
            ? "Creating account..."
            : "Create Account";

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

                    <h1 className={global.heading} style={{ marginBottom: "6px" }}>NoodleNook</h1>
                    <p className={global.subcentered} style={{ marginBottom: "24px" }}>Your cozy personal tracker.</p>
                </div>

                <div className={global.buttonGroup}>
                    <button
                        type="button"
                        className={mode === "login" ? global.buttonBrand : global.buttonSecondary}
                        onClick={() => resetMode("login")}
                    >
                        Log In
                    </button>

                    <button
                        type="button"
                        className={mode === "register" ? global.buttonBrand : global.buttonSecondary}
                        onClick={() => resetMode("register")}
                    >
                        Create Account
                    </button>
                </div>

                <form className={global.authForm} onSubmit={handleSubmit}>
                    {mode === "register" && (
                        <>
                            <label className={global.label}>Name</label>
                            <input
                                id="name"
                                type="text"
                                className={global.input}
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                autoComplete="name"
                                required
                            />
                        </>
                    )}

                    <label className={global.label}>Email</label>
                    <input
                        id="email"
                        type="email"
                        className={global.input}
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        autoComplete="username"
                        required
                    />

                    <label className={global.label}>Password</label>
                    <input
                        id="password"
                        type="password"
                        className={global.input}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        autoComplete={mode === "login" ? "current-password" : "new-password"}
                        required
                    />

                    {mode === "register" && (
                        <>
                            <label className={global.label}>Confirm Password</label>
                            <input
                                id="confirmPassword"
                                type="password"
                                className={global.input}
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

                            <p className={global.formSectionTitle}>Security Questions</p>

                            {securityQuestions.map((item, index) => (
                                <div key={index} className={global.securityQuestionGroup}>
                                    <label className={global.label}>
                                        Security Question {index + 1}
                                    </label>

                                    <select
                                        id={`securityQuestion${index}`}
                                        className={`${global.input} ${securityFieldMissing(index, "question") ? global.inputError : ""}`}
                                        value={item.question}
                                        onChange={(event) => updateSecurityQuestion(index, event.target.value)}
                                        required
                                    >
                                        <option value="">Choose a question</option>

                                        {getAvailSecurityQuestions(index).map((question) => (
                                            <option key={question} value={question}>
                                                {question}
                                            </option>
                                        ))}
                                    </select>

                                    <label className={global.label}>
                                        Security Answer {index + 1}
                                    </label>

                                    <input
                                        id={`securityAnswer${index}`}
                                        type="text"
                                        className={`${global.input} ${securityFieldMissing(index, "answer") ? global.inputError : ""}`}
                                        value={item.answer}
                                        onChange={(event) => updateSecurityAnswer(index, event.target.value)}
                                        autoComplete="off"
                                        required
                                    />
                                </div>
                            ))}
                        </>
                    )}

                    {error && <p className={global.subWarn}>{error}</p>}

                    <button
                        type="submit"
                        className={global.buttonBrand}
                        disabled={
                            loading ||
                            !email ||
                            !password ||
                            (mode === "register" &&
                                (!name ||
                                    !confirmPassword ||
                                    !passwordValidation.isValid ||
                                    passwordsDoNotMatch
                                ))
                        }
                    >
                        {submitText}
                    </button>

                    {mode === "login" && (
                        <Link
                            href="/forgot-password"
                            className={global.link}
                            style={{
                                gridColumn: "1 / -1",
                                justifySelf: "center",
                                padding: 0,
                                marginTop: "-4px",
                            }}
                        >
                            Forgot password?
                        </Link>
                    )}
                </form>
            </section>
        </main>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <LoginContent />
        </Suspense>
    );
}