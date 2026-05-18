"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { tooltipRegistry } from "./TTRegistry";
import { useCurrentUser } from "@/lib/useCurrentUser";

type ToolTipContextType = {
    dismissed: string[];
    dismiss: (id: string) => void;
    tooltipsEnabled: boolean;
    setTooltipsEnabled: (val: boolean) => void;
    resetAllTooltips: () => void;
};

const ToolTipContext = createContext<ToolTipContextType>({
    dismissed: [],
    dismiss: () => { },
    tooltipsEnabled: true,
    setTooltipsEnabled: () => { },
    resetAllTooltips: () => { },
});

export function ToolTipProvider({ children }: { children: React.ReactNode }) {
    const [dismissed, setDismissed] = useState<string[]>([]);
    const [tooltipsEnabled, setTooltipsEnabledState] = useState(true);
    const { isAuthenticated } = useCurrentUser();

    useEffect(() => {
        if (!isAuthenticated) return;

        const fetchTooltips = async () => {
            const res = await fetch("/api/user-tooltips");
            if (!res.ok) return console.error("Failed to load tooltips");

            const data = await res.json();
            setDismissed(data.dismissed || []);
            setTooltipsEnabledState(data.tooltipsEnabled ?? true);
        };
        fetchTooltips();
    }, [isAuthenticated]);

    const updateDB = (changes: Partial<{ tooltipsEnabled: boolean; dismissed: string[] }>) => {
        fetch("/api/user-tooltips", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(changes),
        }).catch((err) => console.error("Tooltip DB update failed:", err));
    };

    // Dismiss individual tooltip
    const dismiss = (id: string) => {
        if (dismissed.includes(id)) return;

        setTimeout(() => {
            setDismissed((prev) => {
                if (prev.includes(id)) return prev;
                const updated = [...prev, id];

                updateDB({ dismissed: updated });

                // Check if all tooltips are now dismissed
                const allTipIds = Object.values(tooltipRegistry)
                    .flat()
                    .map((tip) => tip.id);
                const allDismissed = allTipIds.every((tipId) => updated.includes(tipId));

                if (allDismissed) {
                    setTooltipsEnabledState(false);
                    updateDB({ tooltipsEnabled: false });
                }

                return updated;
            })
        }, 1000);
    };

    // Manually toggle tips on/off from profile
    const setTooltipsEnabled = (val: boolean) => {
        setTooltipsEnabledState(val);
        updateDB({ tooltipsEnabled: val });

        // Re-enable all tips if toggling ON
        if (val) {
            setDismissed([]);
            updateDB({ dismissed: [] });
        }
    };

    // Proile toggle shortcut
    const resetAllTooltips = () => {
        setDismissed([]);
        setTooltipsEnabledState(true);
        updateDB({ tooltipsEnabled: true, dismissed: [] });
    }

    return (
        <ToolTipContext.Provider value={{ dismissed, dismiss, tooltipsEnabled, setTooltipsEnabled, resetAllTooltips }}>
            {children}
        </ToolTipContext.Provider>
    );
}

export function useToolTips() {
    return useContext(ToolTipContext);
}