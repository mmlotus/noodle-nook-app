"use client";

import global from "@/styles/Global.module.css";
import { ArrowDownWideNarrow } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type SortOption<T extends string> = {
    value: T;
    label: string;
};

type SortDropdownProps<T extends string> = {
    value: T;
    options: SortOption<T>[];
    onChange: (value: T) => void;
    title?: string;
};

export default function SortDropdown<T extends string>({
    value, options, onChange, title = "Sort By",
}: SortDropdownProps<T>) {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef<HTMLDivElement | null>(null);

    const activeLabel = options.find((option) => option.value === value)?.label || "";

    useEffect(() => {
        if (!open) return;

        function handleClickOutside(event: MouseEvent) {
            if (wrapRef.current && !wrapRef.current.contains(event.target as Node)
            ) {
                setOpen(false);
            }
        }

        function handleEscape(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setOpen(false);
            }
        }

        function handleTab(event: KeyboardEvent) {
            if (event.key === "Tab") {
                setOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEscape);
        document.addEventListener("keydown", handleTab);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEscape);
            document.removeEventListener("keydown", handleTab);
        };
    }, [open]);

    return (
        <>
            <div className={global.activeSortText}>
                {activeLabel}
            </div>

            <div className={global.sortMenuWrap} ref={wrapRef}>
                <button
                    type="button"
                    className={global.sortIconButton}
                    onClick={() => setOpen((current) => !current)}
                    title={title}
                >
                    <ArrowDownWideNarrow size={14} />
                </button>

                {open && (
                    <div className={global.sortDropdown}>
                        {options.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                className={
                                    value === option.value
                                        ? global.sortOptionActive
                                        : global.sortOption
                                }
                                onClick={() => {
                                    onChange(option.value);
                                    setOpen(false);
                                }}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}