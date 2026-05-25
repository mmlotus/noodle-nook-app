self.addEventListener("install", () => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
    // Minimal fetch handler for installability.
});

self.addEventListener("push", (event) => {
    if (!event.data) return;

    let data = {};

    try {
        data = event.data.json();
    } catch {
        data = {
            title: "NoodleNook",
            body: event.data.text(),
            url: "/home",
        };
    }

    const title = data.title || "NoodleNook";
    
    const options = {
        body: data.body || "",
        icon: "/icons/NoodleNook-192x192.png",
        badge: "/icons/NoodleNook-192x192.png",
        data: {
            url: data.url || "/home",
        },
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    const url = event.notification.data?.url || "/home";

    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if ("focus" in client) {
                    client.navigate(url);
                    return client.focus();
                }
            }

            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});