export const dynamic = "force-dynamic";

import { jsonOk, serverError } from "@/lib/api/apiUtils";
import db from "@/lib/db";
import { getActivePushEntries } from "@/lib/push/pushRegistry";
import { sendPushToAllUsers } from "@/lib/push/sendPushNotification";

export async function GET() {
    try {
        const activeEntries = getActivePushEntries();
        const sent: string[] = [];

        for (const entry of activeEntries) {
            const existing = await db.query(
                `SELECT id FROM sent_push_notifications WHERE registry_key = $1`,
                [entry.registryKey]
            );

            if (existing.length > 0) continue;

            await sendPushToAllUsers(entry);

            await db.query(
                `
                    INSERT INTO sent_push_notifications (
                        registry_key,
                        sent_at
                    )
                    VALUES ($1, NOW())
                `,
                [entry.registryKey]
            );

            await db.query(
                `
                INSERT INTO sent_push_notifications (
                    registry_key,
                    sent_at
                ) VALUES ($1, NOW())
            `,
                [entry.registryKey]
            );

            sent.push(entry.registryKey);
        }

        return jsonOk({ success: true, sent });
    } catch (err) {
        return serverError("GET /api/push/cron", err);
    }
}