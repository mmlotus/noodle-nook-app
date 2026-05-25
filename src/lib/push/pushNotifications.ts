function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; i++) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export type PushDeviceStatus = {
    supported: boolean;
    permission: NotificationPermission;
    subscribed: boolean;
};

export async function getPushDeviceStatus(): Promise<PushDeviceStatus> {
    if (typeof window === "undefined") return { supported: false, permission: "default", subscribed: false };
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        return { supported: false, permission: "default", subscribed: false };
    }

    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = registration ? await registration.pushManager.getSubscription() : null;

    return { supported: true, permission: Notification.permission, subscribed: Boolean(subscription) };
}

export async function enablePushNotifications() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        throw new Error("Push notifications not supported");
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") throw new Error("Notification permission not granted");

    const registration = (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.register("/sw.js"));
    const existingSubscription = await registration.pushManager.getSubscription();

    if (existingSubscription) {
        await savePushSubscription(existingSubscription);
        return existingSubscription;
    }

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) throw new Error("Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY");

    const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    await savePushSubscription(subscription);
    return subscription;
}

export async function disablePushNotifications() {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return await deletePushSubscription();

    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await deletePushSubscription(endpoint);
        return;
    }

    await deletePushSubscription();
}

async function savePushSubscription(subscription: PushSubscription) {
    const res = await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription }),
    });

    if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to save push subscription");
    }
}

async function deletePushSubscription(endpoint?: string) {
    const res = await fetch("/api/push", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint }),
    });

    if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to disable push subscription");
    }
}