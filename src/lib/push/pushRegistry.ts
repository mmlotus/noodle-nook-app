export type PushEntry = {
    id: string;
    title: string;
    body: string;
    url: string;
    active: boolean; // Only send if true
};

export type PushRegistry = {
    [groupId: string]: PushEntry[];
};

export const pushRegistry: PushRegistry = {
    system: [
        {
            id: "welcome",
            title: "NoodleNook",
            body: "This is a test push notification.",
            url: "/home",
            active: true,
        },
        {
            id: "noodle",
            title: "NoodleNook Push Test",
            body: "This is a test push notification that should open the Books Tracker.",
            url: "/trackers/books",
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