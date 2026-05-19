export type WeightUnit = "lb" | "kg" | "g" | "st";

const LB_PER_KG = 2.2046226218488;
const LB_PER_G = 0.00220462262185;
const LB_PER_STONE = 14;

export function roundToTwo(value: number): number {
    return Math.round(value * 100) / 100;
}

export function toPounds(value: number, unit: WeightUnit): number {
    if (!Number.isFinite(value)) {
        throw new Error("Invalid weight value.");
    }

    switch (unit) {
        case "lb":
            return roundToTwo(value);

        case "kg":
            return roundToTwo(value * LB_PER_KG);

        case "g":
            return roundToTwo(value / LB_PER_G);

        case "st":
            return roundToTwo(value * LB_PER_STONE);
    }
}

export function fromPounds(weightLb: number, unit: WeightUnit): number {
    if (!Number.isFinite(weightLb)) {
        throw new Error("Invalid weight value.");
    }

    switch (unit) {
        case "lb":
            return roundToTwo(weightLb);

        case "kg":
            return roundToTwo(weightLb / LB_PER_KG);

        case "g":
            return Math.round(weightLb / LB_PER_G);

        case "st":
            return roundToTwo(weightLb / LB_PER_STONE);
    }
}

export function formatWeight(weightLb: number, unit: WeightUnit): string {
    const converted = fromPounds(weightLb, unit);

    if (unit === "g") {
        return `${converted.toLocaleString()}g`;
    }

    return `${converted.toFixed(2)}${unit}`;
}

export const weightUnitOptions: { label: string; value: WeightUnit }[] = [
    { label: "Pounds", value: "lb" },
    { label: "Kilograms", value: "kg" },
    { label: "Stone", value: "st" },
    { label: "Grams", value: "g" },
];