export const dynamic = "force-dynamic";

import { jsonOk, serverError } from "@/lib/api/apiUtils";
import db from "@/lib/db";
import { getActivePushEntries } from "@/lib/push/pushRegistry";
import { sendPushToAllUsers } from "@/lib/push/sendPushNotification";

export async function GET(req: Request) {
    try {
        const providedSecret = req.headers.get("x-push-send-secret");
        const expectedSecret = process.env.PUSH_SEND_SECRET;

        if (!expectedSecret) {
            return Response.json(
                { error: "PUSH_SEND_SECRET is missing on the server." },
                { status: 500 }
            );
        }

        if (!providedSecret) {
            return Response.json(
                { error: "Missing x-push-send-secret header." },
                { status: 401 }
            );
        }

        if (providedSecret !== expectedSecret) {
            return Response.json(
                {
                    error: "Invalid push send secret.",
                    providedLength: providedSecret.length,
                    expectedLength: expectedSecret.length,
                },
                { status: 401 }
            );
        }

        const activeEntries = getActivePushEntries();
        const sent: string[] = [];

        for (const entry of activeEntries) {
            const existing = await db.query(
                `
                    SELECT id
                    FROM sent_push_notifications
                    WHERE registry_key = $1
                `,
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

            sent.push(entry.registryKey);
        }

        return jsonOk({
            success: true,
            sent,
        });
    } catch (err) {
        return serverError("GET /api/push/cron", err);
    }
}