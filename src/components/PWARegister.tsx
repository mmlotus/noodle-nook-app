"use client";

import { syncPushSubscription } from "@/lib/push/pushNotifications";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

export default function PWARegister() {
    const { status } = useSession();

    useEffect(() => {
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker
                .register("/sw.js")
                .then((registration) => {
                    console.log("Service worker reegistered:", registration.scope);
                })
                .catch((error) => {
                    console.error("Service worker registration failed:", error);
                });
        }
    }, []);

    useEffect(() => {
        if (status !== "authenticated") return;

        const sync = () => {
            syncPushSubscription().catch((err) => {
                console.error("Push subscription synchronization failed:", err);
            });
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") sync();
        };

        sync();

        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [status]);

    return null;
}