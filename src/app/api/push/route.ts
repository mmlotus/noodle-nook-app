import { jsonError, jsonOk, serverError } from "@/lib/api/apiUtils";
import { withUser } from "@/lib/api/withUser";
import db from "@/lib/db";

type PushSubscriptionPayload = {
    subscription?: PushSubscriptionJSON;
    syncOnly?: boolean;
    previousEndpoint?: string;
};

export const POST = withUser(async (req, _context, user) => {
    try {
        const body = (await req.json()) as PushSubscriptionPayload;
        const subscription = body.subscription;

        if (!subscription || !subscription.endpoint) {
            return jsonError("Missing or invalid push subscription.", 400);
        }

        if (body.syncOnly === true) {
            const result = await db.query(
                `
                    INSERT INTO push_subscriptions (
                        user_id,
                        endpoint,
                        subscription,
                        updated_at
                    )
                    SELECT id, $2, $3, NOW()
                    FROM users
                    WHERE id = $1
                        AND push_notifications_enabled = TRUE
                    ON CONFLICT (endpoint)
                    DO UPDATE SET
                        user_id = EXCLUDED.user_id,
                        subscription = EXCLUDED.subscription,
                        updated_at = NOW()
                    RETURNING id
                `,
                [user.id, subscription.endpoint, JSON.stringify(subscription)]
            );

            if (
                result.length > 0 &&
                typeof body.previousEndpoint === "string" &&
                body.previousEndpoint !== subscription.endpoint
            ) {
                await db.query(
                    `
                        DELETE FROM push_subscriptions
                        WHERE user_id = $1
                            AND endpoint = $2
                    `,
                    [user.id, body.previousEndpoint]
                );
            }

            return jsonOk({
                success: true,
                synced: result.length > 0,
            });
        }

        await db.query(
            `
                INSERT INTO push_subscriptions (
                    user_id,
                    endpoint,
                    subscription,
                    updated_at
                )
                VALUES ($1, $2, $3, NOW())
                ON CONFLICT (endpoint)
                DO UPDATE SET
                    user_id = EXCLUDED.user_id,
                    subscription = EXCLUDED.subscription,
                    updated_at = NOW()
            `,
            [
                user.id,
                subscription.endpoint,
                JSON.stringify(subscription),
            ]
        );

        await db.query(
            `
                UPDATE users
                SET
                    push_notifications_enabled = true,
                    push_subscription_status = 'enabled',
                    push_notifications_updated_at = NOW()
                WHERE id = $1
            `,
            [user.id]
        );

        return jsonOk({
            success: true,
            message: "Push subscription saved.",
        });
    } catch (err) {
        return serverError("POST /api/push", err);
    }
});

export const DELETE = withUser(async (req, _context, user) => {
    try {
        const body = await req.json().catch(() => ({}));
        const endpoint = body.endpoint;

        if (endpoint && typeof endpoint !== "string") {
            return jsonError("Invalid push subscription endpoint.", 400);
        }

        if (endpoint) {
            await db.query(
                `
                    DELETE FROM push_subscriptions
                    WHERE user_id = $1
                        AND endpoint = $2
                `,
                [user.id, endpoint]
            );
        } else {
            await db.query(
                `
                    DELETE FROM push_subscriptions
                    WHERE user_id = $1
                `,
                [user.id]
            );
        }

        await db.query(
            `
                UPDATE users
                SET
                    push_notifications_enabled = false,
                    push_subscription_status = 'disabled',
                    push_notifications_updated_at = NOW()
                WHERE id = $1
            `,
            [user.id]
        );

        return jsonOk({ success: true });
    } catch (err) {
        return serverError("DELETE /api/push", err);
    }
});