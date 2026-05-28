export function formatCurrency(value: number | string | null) {
    const numericValue = Number(value || 0);

    return numericValue.toLocaleString(undefined, {
        style: "currency",
        currency: "USD",
    });
}

export function isValidMoneyInput(value: string) {
    return /^\d*\.?\d{0,2}$/.test(value);
}