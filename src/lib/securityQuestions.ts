import bcrypt from "bcryptjs";

export const SECURITY_QUESTIONS = [
    "What was the name of your first pet?",
    "What was your childhood best friend's first name?",
    "What was the name of your first school?",
    "What city were you born in?",
    "What was your favorite childhood book?",
    "What was the name of the street you grew up on?",
    "What was your childhood nickname?",
    "What was the name of your first stuffed animal?",
    "What was your favorite teacher's last name?",
    "What was the first concert you attended?",
];

export function normalizeSecurityAnswer(answer: string) {
    return answer.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isValidSecurityQuestion(question: string) {
    return SECURITY_QUESTIONS.includes(question);
}

export async function hashSecurityAnswer(answer: string) {
    return bcrypt.hash(normalizeSecurityAnswer(answer), 12);
}

export async function compareSecurityAnswer(answer: string, answerHash: string) {
    return bcrypt.compare(normalizeSecurityAnswer(answer), answerHash);
}