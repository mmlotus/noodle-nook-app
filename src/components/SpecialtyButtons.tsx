"use client";
import React from "react";
import global from "@/styles/Global.module.css";
import { Kind } from "@/types";

{/* FILTER BUTTONS */ }
type FiltersBase = Record<string, Kind>;

interface FilterButtonProps<TFilters extends FiltersBase> {
    label: string;
    value: string | number;
    field: keyof TFilters;
    filters: TFilters;
    setFilters: React.Dispatch<React.SetStateAction<TFilters>>;
    handleSearch: (next: TFilters) => void
}

export function FilterButton<TFilters extends FiltersBase>({
    label,
    value,
    field,
    filters,
    setFilters,
    handleSearch,
}: FilterButtonProps<TFilters>) {
    const isActive = filters[field] === value;

    const handleClick = () => {
        const next = { ...filters, [field]: isActive ? "" : value };
        setFilters(next);
        handleSearch(next);
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            className={`${global.filterBtn} ${isActive ? global.filterBtnActive : ""}`}
        >
            {label}
        </button>
    );
};


{/* LLC/CAT/ETC. TAGS */ }
type TagsProps = {
    value: string | null | undefined;
    fallback?: string;
    type?: "llc" | "cat";
};

export function CompTags({ value, fallback = "N/A", type = "llc" }: TagsProps) {
    if (!value || value.trim().toUpperCase() === "N/A") {
        const naClass = type === "cat" ? global.catTagNA : global.llcTagNA;
        const baseClass = type === "cat" ? global.catTag : global.llcTag;

        return (
            <div className={global.llcTagWrapper}>
                <span className={`${baseClass} ${naClass}`}>
                    {fallback}
                </span>
            </div>
        );
    }

    const items = value.split(",").map(v => v.trim());

    return (
        <div className={global.llcTagWrapper}>
            {items.map((item, i) => {
                const classKey = (type === "cat" ? "catTag" : "llcTag") + item.replace(/[\s/.]/g, "");
                const tagClass = type === "cat" ? global.catTag : global.llcTag;
                const styles = global as Record<string, string>;
                const colorClass = styles[classKey] || global.llcTagDefault;

                return (
                    <span key={i} className={`${tagClass} ${colorClass}`}>
                        {item}
                    </span>
                );
            })}
        </div>
    );
}
