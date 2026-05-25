export const FEDERAL_MILEAGE_RATES: Record<number, number> = {
    2023: 0.655,
    2024: 0.67,
    2025: 0.7,
    2026: 0.725,
};

export const DEFAULT_MILEAGE_REIMB_RATE = FEDERAL_MILEAGE_RATES[2026];

export function getFederalMileageRateForDate(dateValue?: string | null): number {
    if (!dateValue) {
        return DEFAULT_MILEAGE_REIMB_RATE;
    }

    const year = Number(dateValue.slice(0, 4));

    if (!Number.isFinite(year)) {
        return DEFAULT_MILEAGE_REIMB_RATE;
    }

    return FEDERAL_MILEAGE_RATES[year] ?? DEFAULT_MILEAGE_REIMB_RATE;
}