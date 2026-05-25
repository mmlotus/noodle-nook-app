import webpush from "web-push";
import db from "@/lib/db";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT;

if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    throw new Error("Missing VAPID environment variables.");
}

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

type PushPayload = {
    title: string;
    body: string;
    url: string;
};

export async function sendPushToAllUsers(payload: PushPayload) {
    const subscriptions = await db.query(
        `
            SELECT id, subscription
            FROM push_subscriptions
        `
    );

    await Promise.all(
        subscriptions.map(async (row) => {
            try {
                await webpush.sendNotification(
                    row.subscription,
                    JSON.stringify(payload)
                );
            } catch (err: unknown) {
                console.error("Push send error:", err);

                const statusCode =
                    typeof err === "object" && err !== null && "statusCode" in err
                        ? (err as { statusCode?: number }).statusCode
                        : undefined;

                if (statusCode === 404 || statusCode === 410) {
                    await db.query(
                        `
                            DELETE FROM push_subscriptions
                            WHERE id = $1
                        `,
                        [row.id]
                    );
                }
            }
        })
    );
}