"use client";

import { useEffect } from "react";

type ThemePref = "system" | "light" | "dark";

export default function ThemeApplier() {
    useEffect(() => {
        const root = document.documentElement;
        const media = window.matchMedia("(prefers-color-scheme: dark)");
        let removeSystemListener: (() => void) | null = null;

        const resolveTheme = (pref: ThemePref): "light" | "dark" => {
            if (pref === "light") return "light";
            if (pref === "dark") return "dark";
            return media.matches ? "dark" : "light";
        };

        const applyTheme = (pref: ThemePref) => {
            root.setAttribute("data-theme", resolveTheme(pref));
        };

        const cleanUpSystemListener = () => {
            if (removeSystemListener) {
                removeSystemListener();
                removeSystemListener = null;
            }
        };

        const loadThemeFromProfile = async () => {
            cleanUpSystemListener();

            try {
                const res = await fetch("/api/profiles/user-profile", {
                    method: "GET",
                    credentials: "include",
                    cache: "no-store",
                });

                if (!res.ok) {
                    applyTheme("system");
                    return;
                }

                const data = await res.json();
                const pref: ThemePref =
                    data.theme_preference === "light" ||
                        data.theme_preference === "dark" ||
                        data.theme_preference === "system"
                        ? data.theme_preference
                        : "system";

                applyTheme(pref);

                if (pref === "system") {
                    const handleChange = () => applyTheme("system");
                    media.addEventListener("change", handleChange);
                    removeSystemListener = () => {
                        media.removeEventListener("change", handleChange);
                    };
                }
            } catch {
                applyTheme("system");
            }
        };

        const handleThemeRefresh = () => {
            loadThemeFromProfile();
        };

        loadThemeFromProfile();
        window.addEventListener("theme-preference-updated", handleThemeRefresh);

        return () => {
            cleanUpSystemListener();
            window.removeEventListener("theme-preference-updated", handleThemeRefresh);
        };
    }, []);

    return null;
}