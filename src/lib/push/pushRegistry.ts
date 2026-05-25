export type PushEntry = {
    id: string;
    title: string;
    body: string;
    url: string;
    active: boolean;
};

export type PushRegistry = {
    [groupId: string]: PushEntry[];
};

export const pushRegistry: PushRegistry = {
    system: [
        {
            id: "launch-test-001",
            title: "NoodleNook",
            body: "This is the push notification text I want to send.",
            url: "/home",
            active: true,
        },
    ],
};

export function getActivePushEntries() {
    return Object.entries(pushRegistry).flatMap(([groupId, entries]) =>
        entries
            .filter((entry) => entry.active)
            .map((entry) => ({
                ...entry,
                registryKey: `${groupId}.${entry.id}`,
            }))
    );
}