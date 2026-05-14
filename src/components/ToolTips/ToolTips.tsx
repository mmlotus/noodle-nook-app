"use client";

import { useToolTips } from "./ToolTipProvider";
import tips from "@/styles/ToolTips.module.css";
import { tooltipRegistry } from "./TTRegistry";
import { useState } from "react";

export default function ToolTips({ pageId }: { pageId: string }) {
    const { dismissed, dismiss, tooltipsEnabled } = useToolTips();
    const [exiting, setExiting] = useState<string[]>([]);

    //console.log("🔍 tooltipsEnabled:", tooltipsEnabled);
    //console.log("🔍 dismissed:", dismissed);
    //console.log("🔍 pageId:", pageId);
    
    if (tooltipsEnabled === false || dismissed === undefined) {
        //console.log("⏳ Waiting on tooltips prefs...");
        return null;
    }

    const rawTips = tooltipRegistry[pageId];
    if (!tooltipsEnabled) {
        //console.log("tooltips are disabled");
        return null;
    }

    if (!rawTips) {
        //console.log("no tooltips found for pageId:", pageId);
        return null;
    }

    const tooltips = rawTips.filter((t) => !dismissed.includes(t.id) || exiting.includes(t.id));
    //console.log("tooltips to show:", tooltips);

    if (tooltips.length === 0) {
        //console.log("all tooltips dismissed");
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
                                setTimeout(() => dismiss(tip.id), 1000);
                            }}
                            aria-label="Dismiss"
                        >&times;</button>
                        <strong>{tip.title}</strong>
                        <p>{tip.message1}</p>
                        {tip.message2?.trim() && <p>{tip.message2}</p>}
                    </div>
                );
            })}
        </div>
    );
}