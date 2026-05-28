"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { tooltipRegistry } from "./TTRegistry";
import { useCurrentUser } from "@/lib/useCurrentUser";

type ToolTipContextType = {
    dismissed: string[];
    dismiss: (id: string) => void;
    tooltipsEnabled: boolean;
    tooltipsReady: boolean;
    setTooltipsEnabled: (val: boolean) => void;
    resetAllTooltips: () => void;
};

const ToolTipContext = createContext<ToolTipContextType>({
    dismissed: [],
    dismiss: () => { },
    tooltipsEnabled: false,
    tooltipsReady: false,
    setTooltipsEnabled: () => { },
    resetAllTooltips: () => { },
});

export function ToolTipProvider({ children }: { children: React.ReactNode }) {
    const [dismissed, setDismissed] = useState<string[]>([]);
    const [tooltipsEnabled, setTooltipsEnabledState] = useState(false);
    const [tooltipsReady, setTooltipsReady] = useState(false);
    const { isAuthenticated } = useCurrentUser();

    useEffect(() => {
        if (!isAuthenticated) return;

        let cancelled = false;

        const fetchTooltips = async () => {
            try {
                const res = await fetch("/api/user-tooltips");

                if (!res.ok) {
                    console.error("Failed to load tooltips");

                    if (!cancelled) {
                        setDismissed([]);
                        setTooltipsEnabledState(false);
                        setTooltipsReady(true);
                    }

                    return;
                }

                const data = await res.json();

                if (cancelled) return;

                setDismissed(Array.isArray(data.dismissed) ? data.dismissed : []);
                setTooltipsEnabledState(data.tooltipsEnabled === true);
                setTooltipsReady(true);
            } catch (err) {
                console.error("Failed to load tooltips:", err);

                if (!cancelled) {
                    setDismissed([]);
                    setTooltipsEnabledState(false);
                    setTooltipsReady(true);
                }
            }
        };

        fetchTooltips();

        return () => {
            cancelled = true;
        };
    }, [isAuthenticated]);

    const updateDB = (changes: Partial<{ tooltipsEnabled: boolean; dismissed: string[] }>) => {
        fetch("/api/user-tooltips", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(changes),
        }).catch((err) => console.error("Tooltip DB update failed:", err));
    };

    const dismiss = (id: string) => {
        if (dismissed.includes(id)) return;

        setDismissed((prev) => {
            if (prev.includes(id)) return prev;

            const updated = [...prev, id];

            updateDB({ dismissed: updated });

            const allTipIds = Object.values(tooltipRegistry)
                .flat()
                .map((tip) => tip.id);

            const allDismissed = allTipIds.every((tipId) => updated.includes(tipId));

            if (allDismissed) {
                setTooltipsEnabledState(false);
                updateDB({ tooltipsEnabled: false });
            }

            return updated;
        });
    };

    const setTooltipsEnabled = (val: boolean) => {
        setTooltipsEnabledState(val);
        updateDB({ tooltipsEnabled: val });

        if (val) {
            setDismissed([]);
            updateDB({ dismissed: [] });
        }
    };

    const resetAllTooltips = () => {
        setDismissed([]);
        setTooltipsEnabledState(true);
        updateDB({ tooltipsEnabled: true, dismissed: [] });
    };

    return (
        <ToolTipContext.Provider
            value={{
                dismissed,
                dismiss,
                tooltipsEnabled,
                tooltipsReady,
                setTooltipsEnabled,
                resetAllTooltips,
            }}
        >
            {children}
        </ToolTipContext.Provider>
    );
}

export function useToolTips() {
    return useContext(ToolTipContext);
}