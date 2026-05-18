export type PasswordValidationResult = {
    isValid: boolean;
    errors: string[];
};

export function validatePassword(password: string): PasswordValidationResult {
    const errors: string[] = [];

    if (password.length < 12) {
        errors.push("Password must be at least 12 characters.");
    }

    if (!/[a-z]/.test(password)) {
        errors.push("Password must include at least one lowercase letter.");
    }

    if (!/[A-Z]/.test(password)) {
        errors.push("Password must include at least one uppercase letter.");
    }

    if (!/[0-9]/.test(password)) {
        errors.push("Password must include at least one number.");
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
        errors.push("Password must include at least one special character.");
    }

    if (password.trim() !== password) {
        errors.push("Password cannot start or end with a space.");
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}