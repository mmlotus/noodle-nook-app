"use client";

import { useState } from "react";
import { useToolTips } from "./ToolTipProvider";
import tips from "@/styles/ToolTips.module.css";
import { tooltipRegistry } from "./TTRegistry";

export default function ToolTips({ pageId }: { pageId: string }) {
    const { dismissed, dismiss, tooltipsEnabled, tooltipsReady } = useToolTips();
    const [exiting, setExiting] = useState<string[]>([]);

    if (!tooltipsReady || !tooltipsEnabled) {
        return null;
    }

    const rawTips = tooltipRegistry[pageId];

    if (!rawTips) {
        return null;
    }

    const tooltips = rawTips.filter((tip) => {
        return !dismissed.includes(tip.id) || exiting.includes(tip.id);
    });

    if (tooltips.length === 0) {
        return null;
    }

    return (
        <div className={tips.tipStack}>
            {tooltips.map((tip) => {
                const isExiting = exiting.includes(tip.id);
                const animClass = isExiting ? tips.animateOut : tips.animateIn;

                return (
                    <div key={tip.id} className={`${tips.container} ${animClass}`}>
                        <button
                            className={tips.dismissBtn}
                            onClick={() => {
                                setExiting((prev) => [...prev, tip.id]);

                                setTimeout(() => {
                                    dismiss(tip.id);
                                    setExiting((prev) => prev.filter((id) => id !== tip.id));
                                }, 1000);
                            }}
                            aria-label="Dismiss"
                        >
                            &times;
                        </button>

                        <strong>{tip.title}</strong>
                        <p>{tip.message1}</p>
                        {tip.message2?.trim() && <p>{tip.message2}</p>}
                    </div>
                );
            })}
        </div>
    );
}